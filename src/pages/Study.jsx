import { useMemo } from 'react';
import { lifeStudyTopicsCatalog } from '../lib/studyCatalog';
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
  const groupedTopics = useMemo(() => ({
    finance: lifeStudyTopicsCatalog.filter((topic) => topic.category === '금융 상식'),
    issues: lifeStudyTopicsCatalog.filter((topic) => topic.category === '세계 이슈'),
  }), []);
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
    <div className="px-4 pb-6 pt-8 sm:px-5 sm:pt-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h1 className="text-[26px] font-extrabold tracking-tight text-foreground sm:text-3xl">
            {isEnglish ? 'Build everyday money smarts' : '금융 상식 쌓기'}
          </h1>
          {!loading && progress && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[13px] font-bold text-accent-foreground">{progress.xp || 0} XP</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-[14px]">
          {isEnglish
            ? 'Read short, sharp explainers on everyday finance and current global issues tied to money.'
            : '실생활 금융 상식부터 지금 세계 이슈까지, 돈과 연결되는 이야기를 짧고 선명하게 읽어요'}
        </p>
      </div>

      {/* Greeting */}
      {!loading && user && (
        <div className="animate-slide-up rounded-2xl border border-primary/10 bg-primary/5 p-5 mb-6 xl:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] text-foreground">
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
              <p className="text-[12px] text-muted-foreground mt-1">
                {isEnglish ? 'Even one quick read today can make your next money choice easier.' : '오늘 하나만 읽어도 다음 선택이 훨씬 쉬워져요'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 items-start gap-3 min-[390px]:grid-cols-2 xl:grid-cols-3">
            <div className="h-fit rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[12px] font-semibold text-foreground">{isEnglish ? 'Current streak' : '현재 스트릭'}</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{isEnglish ? `${streakStatus.streakCount} days` : `${streakStatus.streakCount}일`}</p>
              <p className="text-[11px] text-muted-foreground">{isEnglish ? `Best ${streakStatus.bestStreak} days` : `최고 ${streakStatus.bestStreak}일`}</p>
            </div>
            <div className="h-fit rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-sky-500" />
                <span className="text-[12px] font-semibold text-foreground">Freezer</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{isEnglish ? `${streakStatus.streakFreezers}` : `${streakStatus.streakFreezers}개`}</p>
              <p className="text-[11px] text-muted-foreground">
                {isPremium
                  ? (isEnglish ? 'It activates automatically when your streak is at risk.' : '스트릭이 깨질 상황이면 자동으로 사용돼요')
                  : (isEnglish ? 'Premium unlocks automatic streak protection.' : '프리미엄에서 자동 보호 기능을 이용할 수 있어요')}
              </p>
              {freezerHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{isEnglish ? 'Recent freezer history' : '최근 Freezer 이력'}</p>
                  {freezerHistory.map((entry) => {
                    const statusMeta = getFreezerHistoryLabel(entry, isEnglish, locale);

                    return (
                      <div
                        key={`${entry.activatedAt}-${entry.status}`}
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

      {groupedTopics.issues[0] ? (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-amber-500" />
            <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-foreground">{isEnglish ? 'Global issue now' : '지금 보는 세계 이슈'}</h2>
          </div>
          <TopicCard topic={groupedTopics.issues[0]} index={0} />
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-foreground">{isEnglish ? 'Everyday finance' : '실생활 금융 상식'}</h2>
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
