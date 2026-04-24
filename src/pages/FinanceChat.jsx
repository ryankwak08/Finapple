import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFinanceChat, fetchYouthCoreQuestions } from '@/api/financeChatClient';
import { useLanguage } from '@/lib/i18n';
import { getFinanceChatDisclaimer } from '@/lib/legalContent';

export default function FinanceChat() {
  const { locale, isEnglish } = useLanguage();
  const disclaimer = getFinanceChatDisclaimer(isEnglish);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [coreQuestions, setCoreQuestions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

      setIsLoading(true);
      setError('');
    try {
      const data = await fetchFinanceChat({ query: trimmedQuery }, locale);
      setResult(data);
    } catch (requestError) {
      setError(requestError?.message || '요청 처리 중 오류가 발생했습니다.');
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
          disabled={isLoading}
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
            <p className="text-sm font-semibold">{isEnglish ? 'Predicted intent' : '예측 의도'}: {result.predicted_intent}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEnglish ? 'Confidence' : '신뢰도'} {(Number(result.confidence || 0) * 100).toFixed(1)}% · {isEnglish ? 'Routing' : '라우팅'} {result.route_source}
            </p>
            {result.clarification_question ? (
              <p className="mt-2 text-sm text-amber-700">{result.clarification_question}</p>
            ) : null}
          </div>

          {(result.documents || []).map((doc) => (
            <div key={doc.title} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold text-foreground">{doc.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{doc.content}</p>

              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Required Documents' : '필요 서류'}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {(doc.required_documents || []).map((item) => <li key={item}>{item}</li>)}
              </ul>

              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Next Steps' : '다음 단계'}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {(doc.next_actions || []).map((item) => <li key={item}>{item}</li>)}
              </ul>

              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-foreground">{isEnglish ? 'Official Links' : '바로가기'}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {(doc.links || []).map((link) => (
                  <li key={`${link.name}-${link.url}`}>
                    <a href={link.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
