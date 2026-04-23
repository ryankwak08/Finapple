import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { lifeStudyTopicsCatalog } from '../lib/studyData';
import TopicCard from '../components/study/TopicCard';
import useProgress from '../lib/useProgress';
import PullToRefresh from '../components/PullToRefresh';
import { Globe2, Star, Flame, Snowflake } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

function formatHistoryTime(value, locale) {
  if (!value) return '';

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getFreezerHistoryLabel(entry, isEnglish, locale) {
  if (entry.status === 'used' || entry.status === 'used_auto') {
    return {
      title: entry.status === 'used_auto' ? (isEnglish ? 'Auto protection used' : '자동 보호 사용') : (isEnglish ? 'Streak protected' : '스트릭 보호 성공'),
      detail: entry.consumedAt ? (isEnglish ? `Protected on ${formatHistoryTime(entry.consumedAt, locale)}` : `${formatHistoryTime(entry.consumedAt, locale)}에 보호 완료`) : (isEnglish ? 'Your streak stayed safe.' : '스트릭이 안전하게 유지됐어요'),
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (entry.status === 'expired') {
    return {
      title: isEnglish ? 'Protection expired' : '보호 시간 만료',
      detail: entry.expiredAt ? (isEnglish ? `Expired on ${formatHistoryTime(entry.expiredAt, locale)}` : `${formatHistoryTime(entry.expiredAt, locale)}에 만료`) : (isEnglish ? 'It expired before being used.' : '사용되지 않고 만료됐어요'),
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  }

  return {
    title: isEnglish ? 'Protection active' : '보호막 활성화',
    detail: entry.expiresAt ? (isEnglish ? `Waiting until ${formatHistoryTime(entry.expiresAt, locale)}` : `${formatHistoryTime(entry.expiresAt, locale)}까지 대기 중`) : (isEnglish ? 'Waiting for the next missed day.' : '다음 1일 공백을 기다리는 중'),
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  };
}

export default function Study() {
  const { progress, loading, user, isPremium, getStreakStatus } = useProgress();
  const { locale, isEnglish } = useLanguage();
  const groupedTopics = useMemo(() => {
    const finance = lifeStudyTopicsCatalog.filter((topic) => topic.category === '금융 상식');
    const issues = lifeStudyTopicsCatalog.filter((topic) => topic.category === '세계 이슈');
    const kiepIssues = issues.filter((topic) => {
      const sourceText = `${topic.sourceLabel || ''} ${topic.sourceUrl || ''}`.toLowerCase();
      return sourceText.includes('kiep') || sourceText.includes('대외경제정책연구원');
    });
    const originalIssues = issues.filter((topic) => (topic.badge || '').toLowerCase() === 'finapple original');

    const featuredKiepIssue = kiepIssues.find((topic) => topic.featured) || kiepIssues[0] || null;
    const compactKiepIssues = kiepIssues.filter((topic) => topic.id !== featuredKiepIssue?.id);

    return {
      finance,
      issues,
      featuredKiepIssue,
      compactKiepIssues,
      originalIssues,
    };
  }, []);
  const streakStatus = getStreakStatus();
  const freezerHistory = streakStatus.freezerHistory.slice(0, 3);
  const displayName =
    user?.user_metadata?.nickname?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    (isEnglish ? 'Learner' : '학습자');

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="w-full max-w-full overflow-x-hidden px-2.5 pb-24 pt-3 sm:px-5 sm:pb-8 sm:pt-10">
      {/* Header */}
      <div className="mb-3 sm:mb-8">
        <div className="mb-2 flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between">
          <h1 className={`text-[18px] font-extrabold tracking-tight text-foreground sm:text-3xl ${isEnglish ? 'max-w-[12ch]' : 'max-w-[9ch] sm:max-w-none'}`}>
            {isEnglish ? 'Build everyday money smarts' : '금융 상식 쌓기'}
          </h1>
          {!loading && progress && (
            <div className="flex w-fit shrink-0 items-center gap-1.5 self-start rounded-full bg-accent/15 px-2 py-1">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="text-[10px] font-bold text-accent-foreground">{progress.xp || 0} XP</span>
            </div>
          )}
        </div>
        <p className="max-w-lg text-[11px] leading-relaxed text-muted-foreground">
          {isEnglish
            ? 'Read short, sharp explainers on everyday finance and current global issues tied to money.'
            : '실생활 금융 상식부터 지금 세계 이슈까지, 돈과 연결되는 이야기를 짧고 선명하게 읽어요'}
        </p>
      </div>

      {/* Greeting */}
      {!loading && user && (
        <div className="mb-4 animate-slide-up rounded-2xl border border-primary/10 bg-primary/5 p-3 xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-foreground">
                {isEnglish ? (
                  <>
                    Welcome back, <span className="font-bold">{displayName}</span>! 👋
                  </>
                ) : (
                  <>
                    <span className="font-bold">{displayName}</span>님, 환영합니다! 👋
                  </>
                )}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {isEnglish ? 'Even one quick read today can make your next money choice easier.' : '오늘 하나만 읽어도 다음 선택이 훨씬 쉬워져요'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-fit rounded-xl border border-border bg-background/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-[10px] font-semibold text-foreground">{isEnglish ? 'Current streak' : '현재 스트릭'}</span>
              </div>
              <p className="mt-1 text-[15px] font-extrabold text-foreground">{isEnglish ? `${streakStatus.streakCount} days` : `${streakStatus.streakCount}일`}</p>
              <p className="text-[10px] text-muted-foreground">{isEnglish ? `Best ${streakStatus.bestStreak} days` : `최고 ${streakStatus.bestStreak}일`}</p>
            </div>
            <div className="h-fit rounded-xl border border-border bg-background/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-sky-500" />
                <span className="text-[10px] font-semibold text-foreground">Freezer</span>
              </div>
              <p className="mt-1 text-[15px] font-extrabold text-foreground">{isEnglish ? `${streakStatus.streakFreezers}` : `${streakStatus.streakFreezers}개`}</p>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {isPremium
                  ? (isEnglish ? 'It activates automatically when your streak is at risk.' : '스트릭이 깨질 상황이면 자동으로 사용돼요')
                  : (isEnglish ? 'Premium unlocks automatic streak protection.' : '프리미엄에서 자동 보호 기능을 이용할 수 있어요')}
              </p>
              {freezerHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{isEnglish ? 'Recent freezer history' : '최근 Freezer 이력'}</p>
                  {freezerHistory.map((entry, index) => {
                    const statusMeta = getFreezerHistoryLabel(entry, isEnglish, locale);

                    return (
                      <div
                        key={`${entry.activatedAt || 'na'}-${entry.consumedAt || entry.expiredAt || 'na'}-${entry.status}-${index}`}
                        className={`rounded-xl border px-3 py-2 ${statusMeta.className}`}
                      >
                        <p className="text-[11px] font-semibold">{statusMeta.title}</p>
                        <p className="mt-1 text-[10px] opacity-80">{statusMeta.detail}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <section className="mb-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">New</p>
          <h2 className="mt-1 text-[16px] font-extrabold text-sky-900">{isEnglish ? 'Youth finance chatbot' : '청년 금융 챗봇'}</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-sky-800/85">
            {isEnglish
              ? 'Ask practical questions and get documents, next actions, and official links in one response.'
              : '실전 질문을 입력하면 필요한 서류, 다음 단계, 공식 링크를 한 번에 안내해요.'}
          </p>
          <Link
            to="/finance-chat"
            className="mt-3 inline-flex rounded-xl bg-sky-700 px-3 py-1.5 text-[10px] font-bold text-white"
          >
            {isEnglish ? 'Open chatbot' : '챗봇 열기'}
          </Link>
        </div>
      </section>

      {groupedTopics.featuredKiepIssue ? (
        <section className="mb-6">
          <div className="mb-3 flex items-start gap-2">
            <Globe2 className="h-4 w-4 text-amber-500" />
            <h2 className="pr-2 text-[12px] font-black uppercase leading-snug tracking-[0.14em] text-foreground whitespace-normal break-words sm:text-[13px] sm:tracking-[0.18em]">
              {isEnglish ? 'Global issue now x KIEP' : '지금 보는 세계 이슈 X 대외경제정책연구원'}
            </h2>
          </div>
          <TopicCard topic={groupedTopics.featuredKiepIssue} index={0} variant="hero" />
          {groupedTopics.compactKiepIssues.length ? (
            <div className="mt-3 space-y-3">
              {groupedTopics.compactKiepIssues.map((topic, i) => (
                <TopicCard key={topic.id} topic={topic} index={i + 1} variant="compact" />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {groupedTopics.originalIssues.length ? (
        <section className="mb-6">
          <div className="mb-3 flex items-start gap-2">
            <Globe2 className="h-4 w-4 text-amber-500" />
            <h2 className="pr-2 text-[12px] font-black uppercase leading-snug tracking-[0.14em] text-foreground whitespace-normal break-words sm:text-[13px] sm:tracking-[0.18em]">FINAPPLE ORIGINAL</h2>
          </div>
          <div className="space-y-3">
            {groupedTopics.originalIssues.map((topic, i) => (
              <TopicCard key={topic.id} topic={topic} index={i + 1} variant="compact" />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-[12px] font-black uppercase leading-snug tracking-[0.14em] text-foreground whitespace-normal break-words sm:text-[13px] sm:tracking-[0.18em]">
            {isEnglish ? 'Everyday finance' : '실생활 금융 상식'}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{isEnglish ? 'Start with practical policy, tax, and housing info you can use right away.' : '바로 써먹을 수 있는 정책, 세금, 주거 정보를 먼저 챙겨요'}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isEnglish ? 'Source: Toss Feed (' : '출처: Toss Feed ('}
            <a
              href="https://toss.im/tossfeed"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              toss.im/tossfeed
            </a>
            )
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {groupedTopics.finance.map((topic, i) => (
            <TopicCard key={topic.id} topic={topic} index={i + 1} />
          ))}
        </div>
      </section>
    </div>
    </PullToRefresh>
  );
}
