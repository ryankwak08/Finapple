import { useEffect, useMemo, useState } from 'react';
import { Medal, Crown, Flame, Snowflake, Star } from 'lucide-react';
import useProgress from '@/lib/useProgress';
import { fetchLeaderboard, syncLeaderboardEntry } from '@/api/leaderboardClient';
import { buildLeaderboardPayload, getLeagueRewardForRank } from '@/lib/leaderboard';
import { getSeasonProgressMeta } from '@/lib/season';

const TOP_RANK_STYLES = {
  1: {
    label: '1위',
    className: 'bg-amber-100 text-amber-700 border border-amber-300',
    iconClassName: 'text-amber-500 fill-amber-400',
    cardClassName: 'border-amber-300/70 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/80 shadow-[0_12px_30px_-18px_rgba(245,158,11,0.65)]',
    avatarRingClassName: 'ring-4 ring-amber-200/80',
    scorePillClassName: 'bg-amber-500 text-white',
    accentClassName: 'text-amber-700',
  },
  2: {
    label: '2위',
    className: 'bg-slate-100 text-slate-700 border border-slate-300',
    iconClassName: 'text-slate-500 fill-slate-400',
    cardClassName: 'border-slate-300/80 bg-gradient-to-r from-slate-50 via-zinc-50 to-slate-100 shadow-[0_10px_24px_-18px_rgba(100,116,139,0.7)]',
    avatarRingClassName: 'ring-4 ring-slate-200/80',
    scorePillClassName: 'bg-slate-700 text-white',
    accentClassName: 'text-slate-700',
  },
  3: {
    label: '3위',
    className: 'bg-orange-100 text-orange-700 border border-orange-300',
    iconClassName: 'text-orange-600 fill-orange-500',
    cardClassName: 'border-orange-300/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 shadow-[0_10px_24px_-18px_rgba(234,88,12,0.65)]',
    avatarRingClassName: 'ring-4 ring-orange-200/80',
    scorePillClassName: 'bg-orange-600 text-white',
    accentClassName: 'text-orange-700',
  },
};

export default function Leaderboard() {
  const { progress, loading, user, getStreakStatus, claimLeagueReward } = useProgress();
  const streakStatus = useMemo(() => getStreakStatus(), [getStreakStatus]);
  const [entries, setEntries] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rewardMessage, setRewardMessage] = useState('');

  const myEntry = useMemo(() => buildLeaderboardPayload({ user, progress, streakStatus }), [user, progress, streakStatus]);

  useEffect(() => {
    if (loading || !progress) {
      return;
    }

    let active = true;
    const hardTimeoutId = window.setTimeout(() => {
      if (active) {
        setRemoteLoading(false);
        setError('리더보드 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
      }
    }, 6000);

    const loadLeaderboard = async () => {
      setRemoteLoading(true);
      setError(null);

      try {
        const remoteEntries = await fetchLeaderboard(20);
        if (active) {
          setEntries(remoteEntries);
        }

        if (user?.email) {
          syncLeaderboardEntry(myEntry)
            .then((syncedEntry) => {
              if (!active || !syncedEntry) {
                return;
              }

              setEntries((currentEntries) => {
                const nextEntries = [
                  syncedEntry,
                  ...currentEntries.filter((entry) => entry.user_id !== syncedEntry.user_id),
                ];

                return nextEntries
                  .sort((left, right) => {
                    if (right.score !== left.score) {
                      return right.score - left.score;
                    }
                    return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
                  })
                  .slice(0, 20);
              });
            })
            .catch((syncError) => {
              if (active) {
                console.error('Leaderboard sync failed:', syncError);
              }
            });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || '리더보드를 불러오지 못했습니다.');
        }
      } finally {
        if (active) {
          setRemoteLoading(false);
        }
        window.clearTimeout(hardTimeoutId);
      }
    };

    loadLeaderboard();

    return () => {
      active = false;
      window.clearTimeout(hardTimeoutId);
    };
  }, [loading, myEntry, progress, user?.email]);

  const normalizedEntries = useMemo(() => (
    entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isMe: entry.user_email === user?.email,
    }))
  ), [entries, user?.email]);

  const myRank = normalizedEntries.find((entry) => entry.isMe)?.rank || null;
  const seasonLabel = myEntry.seasonLabel || streakStatus.leaderboardSeasonLabel;
  const seasonProgress = getSeasonProgressMeta();
  const rewardPreview = getLeagueRewardForRank(myRank);

  useEffect(() => {
    if (!myRank || !myEntry.seasonKey || !progress) {
      return;
    }

    if (streakStatus.leagueRewardClaimedSeasonKey === myEntry.seasonKey) {
      return;
    }

    claimLeagueReward(myRank, myEntry.seasonKey)
      .then((rewardXp) => {
        if (rewardXp > 0) {
          setRewardMessage(`${myRank}위 리그 보상으로 ${rewardXp} XP를 받았어요.`);
        }
      })
      .catch((claimError) => {
        console.error('League reward claim failed:', claimError);
      });
  }, [claimLeagueReward, myEntry.seasonKey, myRank, progress, streakStatus.leagueRewardClaimedSeasonKey]);

  if (loading || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Medal className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">파이내플 리그</h1>
        </div>
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 mt-3">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-[12px] font-semibold text-primary">이번 시즌</p>
              <p className="text-[14px] font-bold text-foreground mt-0.5">{seasonLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">점수는 이번 주 XP, 스트릭, 이번 주 완료 퀴즈, 이번 주 해결 오답을 합산해 계산돼요.</p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {seasonProgress.dayLabels.map((label, index) => (
              <div key={label} className="text-center">
                <div className={`rounded-xl px-2 py-2 border text-[12px] font-bold ${
                  index <= seasonProgress.currentDayIndex
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                }`}>
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${seasonProgress.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-5 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-primary">내 랭킹</p>
            <div className="mt-2 flex items-end gap-3 flex-wrap">
              <h2 className="text-3xl font-extrabold text-foreground">{myRank ? `#${myRank}` : '-'}</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 border border-primary/15 shadow-sm">
                <span className="text-[11px] font-semibold text-primary">시즌 포인트</span>
                <span className="text-xl leading-none font-black text-foreground">{myEntry.score.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">누적 학습 기록은 유지되고 리그 포인트만 주간 초기화돼요.</p>
            <p className="text-[11px] text-primary mt-2">
              현재 순위 예상 리그 보상: {rewardPreview > 0 ? `${rewardPreview} XP` : '보상 구간 밖'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 border border-border">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-[12px] font-bold text-foreground">{streakStatus.streakCount}일</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 border border-border">
              <Snowflake className="w-4 h-4 text-sky-500" />
              <span className="text-[12px] font-bold text-foreground">{streakStatus.streakFreezers}개</span>
            </div>
          </div>
        </div>
      </div>

      {rewardMessage ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
          {rewardMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
          <p className="mt-1 text-[12px]">
            `supabase/leaderboard_entries.sql`을 DB에 적용한 뒤 다시 확인해주세요.
          </p>
        </div>
      ) : remoteLoading && normalizedEntries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
          리더보드를 불러오는 중...
        </div>
      ) : (
      <div className="space-y-3">
        {normalizedEntries.map((entry) => {
          const topRankStyle = TOP_RANK_STYLES[entry.rank];

          return (
          <div
            key={entry.user_id}
            className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
              topRankStyle
                ? topRankStyle.cardClassName
                : entry.isMe
                ? 'bg-primary/5 border-primary/20'
                : 'bg-card border-border'
            }`}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold shadow-sm ${
              TOP_RANK_STYLES[entry.rank]
                ? TOP_RANK_STYLES[entry.rank].className
                : 'bg-muted text-foreground'
            }`}>
              {TOP_RANK_STYLES[entry.rank] ? (
                <Medal className={`w-5 h-5 ${TOP_RANK_STYLES[entry.rank].iconClassName}`} />
              ) : `#${entry.rank}`}
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden ${
              topRankStyle ? topRankStyle.avatarRingClassName : ''
            }`}>
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt={entry.display_name} className="w-full h-full object-cover" />
              ) : (
                <span>{(entry.display_name || '?')[0] || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-bold text-[15px] truncate ${topRankStyle ? topRankStyle.accentClassName : 'text-foreground'}`}>{entry.display_name}</p>
                {entry.isMe && (
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    나
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  topRankStyle
                    ? topRankStyle.scorePillClassName
                    : entry.isMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-900 text-white'
                }`}>
                  <span>{TOP_RANK_STYLES[entry.rank]?.label || `#${entry.rank}`}</span>
                  <span className={`${entry.isMe ? 'text-primary-foreground/80' : 'text-white/75'}`}>·</span>
                  <span>{entry.score.toLocaleString()}P</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                이번 주 XP {entry.xp.toLocaleString()} · 스트릭 {entry.streak_count}일 · 이번 주 해결한 오답 {entry.resolved_review_count}개
              </p>
            </div>
            {topRankStyle ? (
              <Crown className={`w-5 h-5 flex-shrink-0 ${topRankStyle.iconClassName}`} />
            ) : entry.isMe ? <Star className="w-5 h-5 text-accent fill-accent flex-shrink-0" /> : null}
          </div>
        )})}
      </div>
      )}
    </div>
  );
}
