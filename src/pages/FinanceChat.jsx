import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchFinanceChat, fetchYouthCoreQuestions } from '@/api/financeChatClient';
import { useLanguage } from '@/lib/i18n';
import { getFinanceChatDisclaimer } from '@/lib/legalContent';
import { useAuth } from '@/lib/AuthContext';
import { getIsPremium } from '@/lib/premium';
import { safeStorage } from '@/lib/safeStorage';
import { FREE_DAILY_CHAT_LIMIT } from '@/lib/premiumFeatures';
import { moneyPassFamilyCenters } from '@/lib/moneyPassFamilyCenters';
import { moneyPassPolicyMaster } from '@/lib/moneyPassPolicyMaster';

const todayKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const getChatUsageKey = (email) => `finapple:finance-chat-usage:${String(email || 'guest').toLowerCase()}:${todayKey()}`;
const getChatErrorMessage = (error, isEnglish) => {
  if (error?.message === 'CHATBOT_TIMEOUT') {
    return isEnglish
      ? 'The chatbot server is taking too long to respond. Please try again in a moment.'
      : '챗봇 서버 응답이 지연되고 있어요. 잠시 후 다시 시도해주세요.';
  }

  if (error?.message === 'CHATBOT_CONNECTION_FAILED') {
    return isEnglish
      ? 'Could not connect to the chatbot server. Please check the network or backend status.'
      : '챗봇 서버에 연결하지 못했어요. 네트워크 또는 백엔드 상태를 확인해주세요.';
  }

  return error?.message || (isEnglish ? 'Something went wrong while processing your request.' : '요청 처리 중 오류가 발생했습니다.');
};

const getSourceLabel = (source, isEnglish) => {
  if (source === 'family_center_master') {
    return isEnglish ? 'Family center data' : '다문화가족지원센터 데이터';
  }

  if (source === 'policy_master') {
    return isEnglish ? 'Policy master' : '정책 마스터';
  }

  return isEnglish ? 'Guide' : '일반 가이드';
};

const getStatusLabel = (status, isEnglish) => {
  const value = String(status || '').toLowerCase();
  if (value === 'open') return isEnglish ? 'Open' : '신청 가능';
  if (value === 'upcoming') return isEnglish ? 'Upcoming' : '예정';
  if (value === 'closed') return isEnglish ? 'Closed' : '마감';
  if (value === 'always') return isEnglish ? 'Always available' : '상시 확인';
  return status || (isEnglish ? 'Check required' : '확인 필요');
};

const hasItems = (items) => Array.isArray(items) && items.length > 0;
const normalize = (value = '') => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const tokenize = (value = '') => normalize(value)
  .split(/[\s·,./()\-_[\]{}:;!?]+/)
  .map((token) => token.trim())
  .filter((token) => token.length >= 2);

const documentTypeLabels = {
  required: '필수',
  conditional: '조건부',
  optional: '선택',
  unknown: '확인 필요',
};

const compactDocumentLabel = (document) => [
  document.name,
  document.type ? documentTypeLabels[document.type] || document.type : '',
  document.condition,
  document.issuer,
].filter(Boolean).join(' · ');

const toPolicyCard = (policy, score = 0.9) => ({
  title: policy.title,
  content: [
    policy.description,
    policy.benefitSummary ? `혜택: ${policy.benefitSummary}` : '',
    policy.benefitAmount ? `지원금/방식: ${policy.benefitAmount}` : '',
    policy.applicationStatus ? `신청상태: ${policy.applicationStatus}` : '',
    policy.announcementPeriod ? `신청기간: ${policy.announcementPeriod}` : '',
    policy.eligibility ? `대상조건: ${policy.eligibility}` : '',
    policy.importantWarnings ? `주의사항: ${policy.importantWarnings}` : '',
  ].filter(Boolean).join('\n'),
  required_documents: (policy.documents || []).map(compactDocumentLabel),
  next_actions: [
    policy.applicationMethod || '공식 신청 페이지에서 신청 절차를 확인합니다.',
    policy.screeningProcess ? `심사: ${policy.screeningProcess}` : '',
    policy.resultAnnouncement ? `결과 발표: ${policy.resultAnnouncement}` : '',
    policy.paymentSchedule ? `지급 일정: ${policy.paymentSchedule}` : '',
  ].filter(Boolean),
  links: [policy.url ? { name: policy.title, url: policy.url } : null].filter(Boolean),
  score,
  source: 'policy_master',
  policy_id: policy.id,
  application_status: policy.applicationStatus,
  data_confidence: policy.dataConfidence,
});

const toFamilyCenterCard = (center, score = 0.9) => ({
  title: center.name,
  content: [
    `${center.city} 다문화가족지원센터 현황 데이터입니다.`,
    center.address ? `주소: ${center.address}` : '',
    center.phone ? `전화: ${center.phone}` : '',
  ].filter(Boolean).join('\n'),
  required_documents: [],
  next_actions: [
    center.phone ? `${center.phone}로 운영 여부와 상담 가능 시간을 확인합니다.` : '방문 전 운영 여부를 확인합니다.',
    center.address ? `${center.address} 주소를 확인하고 방문/상담 일정을 잡습니다.` : '',
  ].filter(Boolean),
  links: [],
  score,
  source: 'family_center_master',
  policy_id: center.id,
  application_status: 'always',
  data_confidence: 'medium',
});

const getClientPolicyMatches = (query = '') => {
  const text = normalize(query);
  if (!text) return [];

  const requestedPolicyId = String(query || '').match(/정책ID\s*:\s*([a-z0-9-]+)/i)?.[1];
  if (requestedPolicyId) {
    const exactPolicy = moneyPassPolicyMaster.find((policy) => policy.id === requestedPolicyId);
    return exactPolicy ? [toPolicyCard(exactPolicy, 0.99)] : [];
  }

  if (['다문화', '가족지원센터', '가족 센터'].some((term) => text.includes(term))) {
    return moneyPassFamilyCenters
      .map((center) => {
        const haystack = normalize([center.name, center.city, center.address, center.phone].filter(Boolean).join(' '));
        let score = text.includes('다문화') ? 5 : 2;
        tokenize(text).forEach((token) => {
          if (haystack.includes(token)) score += 2;
        });
        return { center, score };
      })
      .sort((a, b) => b.score - a.score || a.center.name.localeCompare(b.center.name, 'ko'))
      .slice(0, 5)
      .map(({ center, score }) => toFamilyCenterCard(center, Math.min(0.99, 0.76 + score / 30)));
  }

  const asksLeaseHousing = ['전월세', '전세', '월세', '임대차'].some((term) => text.includes(term))
    && !['기숙사', '학사'].some((term) => text.includes(term));
  const tokens = new Set(tokenize(text));
  if (asksLeaseHousing) {
    ['주거', '임차', '월세', '전세', '임대차', '주택', '하우징'].forEach((term) => tokens.add(term));
  }

  return moneyPassPolicyMaster
    .map((policy) => {
      const policyText = [
        policy.title,
        policy.description,
        policy.benefitSummary,
        policy.benefitAmount,
        policy.eligibility,
        policy.applicationMethod,
        ...(policy.documents || []).map((document) => document.name),
      ].filter(Boolean).join(' ');

      if (asksLeaseHousing && /기숙사|학사/.test(policyText)) {
        return { policy, score: 0 };
      }
      if (asksLeaseHousing && !/임차|월세|전세|주택|하우징|화재|노후주택|주거환경/.test(policyText)) {
        return { policy, score: 0 };
      }

      const haystack = normalize(policyText);
      const title = normalize(policy.title);
      let score = 0;
      if (title && text.includes(title)) score += 10;
      tokenize(policy.title).forEach((token) => {
        if (text.includes(token)) score += 2;
      });
      tokens.forEach((token) => {
        if (haystack.includes(token)) score += 1;
      });
      return { policy, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score || a.policy.title.localeCompare(b.policy.title, 'ko'))
    .slice(0, 5)
    .map(({ policy, score }) => toPolicyCard(policy, Math.min(0.99, 0.72 + score / 30)));
};

export default function FinanceChat() {
  const { locale, isEnglish } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isPremium = getIsPremium(user);
  const disclaimer = getFinanceChatDisclaimer(isEnglish);
  const [query, setQuery] = useState(() => searchParams.get('query') || '');
  const [result, setResult] = useState(null);
  const [coreQuestions, setCoreQuestions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyUsage, setDailyUsage] = useState(0);

  useEffect(() => {
    const usage = Number(safeStorage.getItem(getChatUsageKey(user?.email)) || 0);
    setDailyUsage(Number.isFinite(usage) ? usage : 0);
  }, [user?.email]);

  useEffect(() => {
    let active = true;
    fetchYouthCoreQuestions(locale)
      .then((questions) => {
        if (active) setCoreQuestions(questions);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [locale]);

  const suggestedQuestions = useMemo(() => {
    return Object.values(coreQuestions).flat().slice(0, 8);
  }, [coreQuestions]);

  const backendPolicyMatches = result?.policy_matches || [];
  const clientPolicyMatches = backendPolicyMatches.length > 0 ? [] : getClientPolicyMatches(result?.query || query);
  const policyMatches = backendPolicyMatches.length > 0 ? backendPolicyMatches : clientPolicyMatches;
  const requestsSinglePolicy = /정책ID\s*:\s*[a-z0-9-]+/i.test(String(result?.query || query || ''));
  const guideDocuments = clientPolicyMatches.length > 0 || requestsSinglePolicy
    ? []
    : (result?.guide_documents
    || (result?.documents || []).filter((doc) => !['policy_master', 'family_center_master'].includes(doc.source)));
  const displayIntent = policyMatches.length > 0 ? '청년지원정책' : result?.predicted_intent;
  const displayRouteSource = policyMatches.length > 0 ? 'policy_master' : result?.route_source;
  const displayConfidence = policyMatches.length > 0
    ? Math.max(...policyMatches.map((doc) => doc.score || 0.9))
    : Number(result?.confidence || 0);
  const fallbackDocuments = policyMatches.length > 0 ? guideDocuments : (result?.documents || []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    if (!isPremium && dailyUsage >= FREE_DAILY_CHAT_LIMIT) {
      setError(isEnglish
        ? 'You used all free chatbot questions for today. Premium unlocks unlimited questions.'
        : '오늘 무료 챗봇 질문을 모두 사용했어요. 프리미엄에서는 제한 없이 질문할 수 있어요.');
      return;
    }

      setIsLoading(true);
      setError('');
    try {
      const data = await fetchFinanceChat({ query: trimmedQuery }, locale);
      setResult(data);
      if (!isPremium) {
        const nextUsage = dailyUsage + 1;
        safeStorage.setItem(getChatUsageKey(user?.email), String(nextUsage));
        setDailyUsage(nextUsage);
      }
    } catch (requestError) {
      setError(getChatErrorMessage(requestError, isEnglish));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-6 rounded-3xl border border-primary/15 bg-primary/5 p-5">
        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-primary">Finapple Assistant</p>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{isEnglish ? 'Youth Finance Chatbot' : '청년 금융 챗봇'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEnglish
            ? 'Ask a question to get required documents and official links.'
            : '질문을 입력하면 필요한 서류와 바로가기 링크를 함께 안내해요.'}
        </p>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
          {disclaimer}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground">
            {isPremium
              ? (isEnglish ? 'Premium · unlimited chatbot' : '프리미엄 · 챗봇 무제한')
              : (isEnglish ? `Free ${Math.max(0, FREE_DAILY_CHAT_LIMIT - dailyUsage)}/${FREE_DAILY_CHAT_LIMIT} left today` : `오늘 무료 ${Math.max(0, FREE_DAILY_CHAT_LIMIT - dailyUsage)}/${FREE_DAILY_CHAT_LIMIT}회 남음`)}
          </span>
          {!isPremium ? (
            <Link to="/premium" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
              {isEnglish ? 'Go Premium' : '무제한으로 사용하기'}
            </Link>
          ) : null}
        </div>
        <Link to="/" className="mt-3 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline">
          {isEnglish ? 'Back to Study Home' : '학습 홈으로 돌아가기'}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <label className="text-xs font-semibold text-muted-foreground">{isEnglish ? 'Question' : '질문'}</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isEnglish ? 'e.g., Tell me the conditions for youth savings account' : '예: 청년도약계좌 가입 조건 알려줘'}
          className="mt-1 min-h-[92px] w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <button
          type="submit"
          disabled={isLoading || (!isPremium && dailyUsage >= FREE_DAILY_CHAT_LIMIT)}
          className="mt-4 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {isLoading ? (isEnglish ? 'Loading...' : '조회 중...') : (isEnglish ? 'Ask Chatbot' : '챗봇에게 물어보기')}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm font-semibold text-destructive">{error}</p> : null}

      {suggestedQuestions.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{isEnglish ? 'Suggested Questions' : '청년 핵심 질문 추천'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-3">
          {result.assistant_message ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm leading-6 text-foreground">{result.assistant_message}</p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold leading-5 text-amber-900">{result.disclaimer || disclaimer}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">{isEnglish ? 'Predicted intent' : '예측 의도'}: {displayIntent}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEnglish ? 'Confidence' : '신뢰도'} {(displayConfidence * 100).toFixed(1)}% · {isEnglish ? 'Routing' : '라우팅'} {displayRouteSource}
            </p>
          </div>

          {policyMatches.length > 0 ? (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                    {isEnglish ? 'Policy Data Results' : '정책 데이터 검색 결과'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {isEnglish
                      ? `${policyMatches.length} matched item(s) from your policy data.`
                      : `Finapple 데이터셋에서 ${policyMatches.length}개를 찾았어요.`}
                  </p>
                </div>
                <span className="rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-bold text-primary">
                  {displayRouteSource}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {policyMatches.map((doc) => (
                  <article key={`${doc.source}-${doc.policy_id || doc.title}`} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-foreground">{doc.title}</h2>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{doc.content}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                          {getSourceLabel(doc.source, isEnglish)}
                        </span>
                        {doc.application_status ? (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {getStatusLabel(doc.application_status, isEnglish)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {hasItems(doc.required_documents) ? (
                      <>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Required Documents' : '필요 서류'}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {doc.required_documents.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </>
                    ) : null}

                    {hasItems(doc.next_actions) ? (
                      <>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Next Steps' : '다음 단계'}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {doc.next_actions.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </>
                    ) : null}

                    {hasItems(doc.links) ? (
                      <>
                        <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Official Links' : '바로가기'}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {doc.links.map((link) => (
                            <li key={`${link.name}-${link.url}`}>
                              <a href={link.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                                {link.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {policyMatches.length === 0 && result.policy_match_count === 0 && (result.documents || []).length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold text-foreground">{isEnglish ? 'No policy data match' : '정책 데이터 매칭 없음'}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isEnglish
                  ? 'I could not find a directly related policy in the current policy/document data. Try a policy name, region, or required document keyword.'
                  : '현재 정책/서류 데이터에서 직접 관련된 항목을 찾지 못했어요. 정책명, 지역, 필요한 서류 키워드를 같이 입력해 주세요.'}
              </p>
            </div>
          ) : null}

          {fallbackDocuments.map((doc) => (
            <div key={doc.title} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold text-foreground">{doc.title}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{doc.content}</p>

              {hasItems(doc.required_documents) ? (
                <>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Required Documents' : '필요 서류'}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {doc.required_documents.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </>
              ) : null}

              {hasItems(doc.next_actions) ? (
                <>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Next Steps' : '다음 단계'}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {doc.next_actions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </>
              ) : null}

              {hasItems(doc.links) ? (
                <>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Official Links' : '바로가기'}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {doc.links.map((link) => (
                      <li key={`${link.name}-${link.url}`}>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
