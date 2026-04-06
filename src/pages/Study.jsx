import { useEffect, useState } from 'react';
import { lifeStudyTopics } from '../lib/studyData';
import TopicCard from '../components/study/TopicCard';
import useProgress from '../lib/useProgress';
import PullToRefresh from '../components/PullToRefresh';
import { Star, Flame, Snowflake } from 'lucide-react';
import useSoundEffects from '@/hooks/useSoundEffects';
import PremiumBadge from '@/components/PremiumBadge';

function formatCountdown(targetTime, now) {
  if (!targetTime) return '';
  const remainingMs = new Date(targetTime).getTime() - now;
  if (remainingMs <= 0) return '00:00:00';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatHistoryTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildLocalFreezerExpiryAt(activatedAt) {
  return new Date(new Date(activatedAt).getTime() + (24 * 60 * 60 * 1000)).toISOString();
}

function getFreezerHistoryLabel(entry) {
  if (entry.status === 'used') {
    return {
      title: '스트릭 보호 성공',
      detail: entry.consumedAt ? `${formatHistoryTime(entry.consumedAt)}에 보호 완료` : '스트릭이 안전하게 유지됐어요',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (entry.status === 'expired') {
    return {
      title: '보호 시간 만료',
      detail: entry.expiredAt ? `${formatHistoryTime(entry.expiredAt)}에 만료` : '사용되지 않고 만료됐어요',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
    };
  }

  return {
    title: '보호막 활성화',
    detail: entry.expiresAt ? `${formatHistoryTime(entry.expiresAt)}까지 대기 중` : '다음 1일 공백을 기다리는 중',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  };
}

export default function Study() {
  const { progress, loading, user, isPremium, getStreakStatus, activateStreakFreezer } = useProgress();
  const { playSuccessSound } = useSoundEffects();
  const [now, setNow] = useState(() => Date.now());
  const streakStatus = getStreakStatus();
  const canUseFreezer = streakStatus.streakFreezers > 0 && !streakStatus.freezerShieldActive;
  const freezerHistory = streakStatus.freezerHistory.slice(0, 3);
  const freezerCountdownTarget = streakStatus.freezerExpiresAt || (
    streakStatus.freezerShieldActive && streakStatus.freezerActivatedAt
      ? buildLocalFreezerExpiryAt(streakStatus.freezerActivatedAt)
      : null
  );
  const remainingShieldTime = streakStatus.freezerShieldActive
    ? formatCountdown(freezerCountdownTarget, now)
    : '';
  const displayName =
    user?.user_metadata?.nickname?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    '학습자';

  useEffect(() => {
    if (!streakStatus.freezerShieldActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [streakStatus.freezerShieldActive]);

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800));
  };

  const handleActivateFreezer = async () => {
    try {
      await activateStreakFreezer();
      await playSuccessSound();
    } catch (error) {
      alert(error.message || 'Freezer를 적용하지 못했어요.');
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">생활 금융 가이드</h1>
          {!loading && progress && (
            <div className="flex items-center gap-1.5 bg-accent/15 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[13px] font-bold text-accent-foreground">{progress.xp || 0} XP</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-[14px]">
          사회초년생이 실제로 자주 부딪히는 돈 문제를 먼저 정리해뒀어요
        </p>
      </div>

      {/* Greeting */}
      {!loading && user && (
        <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/10 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] text-foreground">
                <span className="font-bold">{displayName}</span>님, 환영합니다! 👋
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                오늘 하나만 읽어도 다음 선택이 훨씬 쉬워져요
              </p>
            </div>
            {isPremium && <PremiumBadge compact />}
          </div>
          {streakStatus.freezerShieldActive ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700/70">Freezer Countdown</p>
                  <p className="mt-1 text-[12px] text-sky-700/80">
                    {freezerCountdownTarget ? `${formatHistoryTime(freezerCountdownTarget)}까지 스트릭을 보호해요` : '다음 공백 1일을 보호해요'}
                  </p>
                </div>
                <p className="font-mono text-[22px] font-black tracking-[0.16em] text-sky-700">{remainingShieldTime}</p>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[12px] font-semibold text-foreground">현재 스트릭</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{streakStatus.streakCount}일</p>
              <p className="text-[11px] text-muted-foreground">최고 {streakStatus.bestStreak}일</p>
            </div>
            <div className="rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-sky-500" />
                <span className="text-[12px] font-semibold text-foreground">Freezer</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{streakStatus.streakFreezers}개</p>
              <p className="text-[11px] text-muted-foreground">
                {streakStatus.freezerShieldActive
                  ? '다음 1일 공백 보호가 적용 중이에요'
                  : isPremium
                  ? '필요할 때 직접 사용해 스트릭을 지켜요'
                  : '프리미엄에서 이용 가능'}
              </p>
              {isPremium ? (
                <button
                  type="button"
                  onClick={handleActivateFreezer}
                  disabled={!canUseFreezer}
                  className="mt-3 w-full rounded-xl bg-sky-500 px-3 py-2 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:bg-sky-200"
                >
                  {streakStatus.freezerShieldActive ? '적용 완료' : '지금 Freezer 사용'}
                </button>
              ) : null}
              {freezerHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">최근 Freezer 이력</p>
                  {freezerHistory.map((entry) => {
                    const statusMeta = getFreezerHistoryLabel(entry);

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

      {/* Topics */}
      <div className="space-y-4">
        {lifeStudyTopics.map((topic, i) => (
          <TopicCard key={topic.id} topic={topic} index={i} />
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}
