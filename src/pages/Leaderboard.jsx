import { useEffect, useMemo, useState } from 'react';
import { Medal, Crown, Flame, Snowflake, Star, Loader2, ChartColumn, NotebookPen } from 'lucide-react';
import useProgress from '@/lib/useProgress';
import { fetchLeaderboard, fetchLeaderboardProfile, syncLeaderboardEntry } from '@/api/leaderboardClient';
import { buildLeaderboardPayload, getLeagueRewardForRank } from '@/lib/leaderboard';
import { getPreviousSeasonMeta, getSeasonProgressMeta } from '@/lib/season';
import { getEntryTrackScores, readTrackLeaderboardScores } from '@/lib/leaderboardTrackScores';
import { useTrack } from '@/lib/trackContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/lib/i18n';

const getTopRankStyles = (isEnglish) => ({
  1: {
    label: isEnglish ? '1st' : '1위',
    className: 'bg-amber-100 text-amber-700 border border-amber-300',
    iconClassName: 'text-amber-500 fill-amber-400',
    cardClassName: 'border-amber-300/70 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/80 shadow-[0_12px_30px_-18px_rgba(245,158,11,0.65)]',
    avatarRingClassName: 'ring-4 ring-amber-200/80',
    scorePillClassName: 'bg-amber-500 text-white',
    accentClassName: 'text-amber-700',
  },
  2: {
    label: isEnglish ? '2nd' : '2위',
    className: 'bg-slate-100 text-slate-700 border border-slate-300',
    iconClassName: 'text-slate-500 fill-slate-400',
    cardClassName: 'border-slate-300/80 bg-gradient-to-r from-slate-50 via-zinc-50 to-slate-100 shadow-[0_10px_24px_-18px_rgba(100,116,139,0.7)]',
    avatarRingClassName: 'ring-4 ring-slate-200/80',
    scorePillClassName: 'bg-slate-700 text-white',
    accentClassName: 'text-slate-700',
  },
  3: {
    label: isEnglish ? '3rd' : '3위',
    className: 'bg-orange-100 text-orange-700 border border-orange-300',
    iconClassName: 'text-orange-600 fill-orange-500',
    cardClassName: 'border-orange-300/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 shadow-[0_10px_24px_-18px_rgba(234,88,12,0.65)]',
    avatarRingClassName: 'ring-4 ring-orange-200/80',
    scorePillClassName: 'bg-orange-600 text-white',
    accentClassName: 'text-orange-700',
  },
});

function LeaderboardProfileDialog({ open, onOpenChange, profileData, loading, fallbackEntry, isEnglish }) {
  const profile = profileData?.profile || fallbackEntry || null;
  const seasons = profileData?.seasons || (fallbackEntry ? [fallbackEntry] : []);
  const displayName = profile?.display_name || (isEnglish ? 'Learner' : '학습자');
  const avatarUrl = profile?.avatar_url || '';
  const profileTrackScores = getEntryTrackScores(profile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-3xl border-border p-0">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-6 py-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">{isEnglish ? 'League profile' : '리그 프로필'}</DialogTitle>
            <DialogDescription>{isEnglish ? 'See season points and learning records by season.' : '시즌별 시즌 포인트와 학습 기록을 확인할 수 있어요.'}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isEnglish ? 'Loading profile...' : '프로필을 불러오는 중...'}
            </div>
          ) : profile ? (
            <div className="mt-5 flex items-start gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-3xl bg-primary/10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-primary">
                    {(displayName || '?')[0] || '?'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-primary">{isEnglish ? 'Nickname' : '닉네임'}</p>
                <h3 className="mt-1 truncate text-2xl font-extrabold text-foreground">{displayName}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Season points' : '현재 시즌 포인트'}</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{(profile.score || 0).toLocaleString()}P</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Current XP' : '현재 XP'}</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{(profile.xp || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Current streak' : '현재 스트릭'}</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{isEnglish ? `${profile.streak_count || 0} days` : `${profile.streak_count || 0}일`}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Wrong answers' : '현재 오답'}</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{isEnglish ? `${profile.active_review_count || 0}` : `${profile.active_review_count || 0}개`}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple Youth</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{profileTrackScores.youth.toLocaleString()}P</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple Start</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{profileTrackScores.start.toLocaleString()}P</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple One</p>
                    <p className="mt-1 text-[20px] font-black text-foreground">{profileTrackScores.one.toLocaleString()}P</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{isEnglish ? 'No profile information to show yet.' : '표시할 프로필 정보가 없어요.'}</p>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            <ChartColumn className="h-4 w-4 text-primary" />
            <h4 className="text-[14px] font-bold text-foreground">{isEnglish ? 'Season history' : '시즌별 성적'}</h4>
          </div>

          <div className="space-y-3">
            {seasons.map((season) => (
              <section key={`${season.user_id}-${season.season_key}`} className="rounded-3xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-primary">{season.season_label || season.season_key}</p>
                    <p className="mt-1 text-[22px] font-black text-foreground">{(season.score || 0).toLocaleString()}P</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                    {isEnglish ? 'Season points' : '시즌 포인트'}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">XP</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{(season.xp || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Streak' : '스트릭'}</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{isEnglish ? `${season.streak_count || 0} days` : `${season.streak_count || 0}일`}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">{isEnglish ? 'Wrong answers' : '오답'}</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{isEnglish ? `${season.active_review_count || 0}` : `${season.active_review_count || 0}개`}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple Youth</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{getEntryTrackScores(season).youth.toLocaleString()}P</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple Start</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{getEntryTrackScores(season).start.toLocaleString()}P</p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-4 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">Finapple One</p>
                    <p className="mt-1 text-[18px] font-black text-foreground">{getEntryTrackScores(season).one.toLocaleString()}P</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <NotebookPen className="h-4 w-4" />
                  {isEnglish
                    ? `Completed quizzes ${season.completed_count || 0} · Resolved wrong answers ${season.resolved_review_count || 0}`
                    : `완료 퀴즈 ${season.completed_count || 0}개 · 해결한 오답 ${season.resolved_review_count || 0}개`}
                </div>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Leaderboard() {
  const { activeTrack } = useTrack();
  const { isEnglish, locale } = useLanguage();
  const { progress, loading, user, getStreakStatus, claimLeagueReward, markLeagueRewardSeen } = useProgress();
  const TOP_RANK_STYLES = getTopRankStyles(isEnglish);
  const streakStatus = useMemo(() => getStreakStatus(), [getStreakStatus]);
  const [entries, setEntries] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rewardMessage, setRewardMessage] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const myEntry = useMemo(() => {
    const base = buildLeaderboardPayload({ user, progress, streakStatus });
    const trackScores = readTrackLeaderboardScores({
      user,
      seasonKey: base.seasonKey,
      totalScore: base.score,
      activeTrack,
    });

    return {
      ...base,
      trackScores,
    };
  }, [activeTrack, progress, streakStatus, user]);
  const currentSeasonKey = myEntry.seasonKey || streakStatus.leaderboardSeasonKey;

  useEffect(() => {
    if (loading || !progress) {
      return;
    }

    let active = true;
    const hardTimeoutId = window.setTimeout(() => {
      if (active) {
        setRemoteLoading(false);
        setError(isEnglish ? 'Leaderboard response is taking longer than expected. Please try again shortly.' : '리더보드 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
      }
    }, 6000);

    const loadLeaderboard = async () => {
      setRemoteLoading(true);
      setError(null);

      try {
        const remoteEntries = await fetchLeaderboard(100);
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
                  .slice(0, 100);
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
          setError(loadError.message || (isEnglish ? 'Could not load the leaderboard.' : '리더보드를 불러오지 못했습니다.'));
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
  }, [isEnglish, loading, myEntry, progress, user?.email]);

  const sortedEntries = useMemo(() => {
    if (!user?.id || !user?.email) {
      return entries;
    }

    const existingMe = entries.find((entry) => entry.user_id === user.id || entry.user_email === user.email);
    if (existingMe) {
      return [...entries]
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }
          return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
        });
    }

    const nextEntries = [{
      user_id: user.id,
      user_email: user.email,
      display_name: myEntry.displayName,
      avatar_url: myEntry.avatarUrl || '',
      season_key: myEntry.seasonKey,
      season_label: myEntry.seasonLabel,
      season_start_date: myEntry.seasonStartDate,
      season_end_date: myEntry.seasonEndDate,
      xp: myEntry.xp || 0,
      streak_count: myEntry.streakCount || 1,
      best_streak: myEntry.bestStreak || 1,
      streak_freezers: myEntry.streakFreezers || 0,
      completed_count: myEntry.completedCount || 0,
      active_review_count: myEntry.activeReviewCount || 0,
      resolved_review_count: myEntry.resolvedReviewCount || 0,
      ads_disabled: Boolean(myEntry.adsDisabled),
      score: myEntry.score || 0,
      score_youth: myEntry.trackScores?.youth || 0,
      score_start: myEntry.trackScores?.start || 0,
      score_one: myEntry.trackScores?.one || 0,
      updated_at: new Date().toISOString(),
    }, ...entries];

    return nextEntries
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
      });
  }, [entries, myEntry, user?.email, user?.id]);

  const normalizedEntries = useMemo(() => (
    sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isMe: entry.user_email === user?.email,
    }))
  ), [sortedEntries, user?.email]);

  const visibleEntries = useMemo(() => {
    const topEntries = normalizedEntries.slice(0, 20);
    const meEntry = normalizedEntries.find((entry) => entry.isMe);

    if (!meEntry || topEntries.some((entry) => entry.user_id === meEntry.user_id)) {
      return topEntries;
    }

    return [...topEntries, meEntry];
  }, [normalizedEntries]);

  const mySyncedEntry = useMemo(
    () => normalizedEntries.find((entry) => entry.isMe) || null,
    [normalizedEntries]
  );
  const myRank = normalizedEntries.find((entry) => entry.isMe)?.rank || null;
  const seasonLabel = myEntry.seasonLabel || streakStatus.leaderboardSeasonLabel;
  const seasonProgress = getSeasonProgressMeta(new Date(), locale);
  const rewardPreview = getLeagueRewardForRank(myRank);

  useEffect(() => {
    if (!progress || !user?.id || !currentSeasonKey) {
      return;
    }

    const previousSeason = getPreviousSeasonMeta();
    const claimedSeasonKey = streakStatus.leagueRewardClaimedSeasonKey;
    const seenSeasonKey = streakStatus.leagueRewardSeenSeasonKey;
    const isPreviousSeasonReward = claimedSeasonKey === previousSeason.seasonKey;

    if (
      isPreviousSeasonReward &&
      seenSeasonKey !== claimedSeasonKey &&
      streakStatus.leagueRewardClaimedXp > 0
    ) {
      setRewardMessage(isEnglish
        ? `You received ${streakStatus.leagueRewardClaimedXp} XP for finishing ${streakStatus.leagueRewardClaimedRank}${streakStatus.leagueRewardClaimedRank === 1 ? 'st' : streakStatus.leagueRewardClaimedRank === 2 ? 'nd' : streakStatus.leagueRewardClaimedRank === 3 ? 'rd' : 'th'} in the league.`
        : `${streakStatus.leagueRewardClaimedRank}위 리그 보상으로 ${streakStatus.leagueRewardClaimedXp} XP를 받았어요.`);
      markLeagueRewardSeen(claimedSeasonKey);
      return;
    }

    if (claimedSeasonKey === previousSeason.seasonKey) {
      return;
    }

    let cancelled = false;

    fetchLeaderboard(100, previousSeason.seasonKey)
      .then((previousEntries) => {
        if (cancelled || !previousEntries?.length) {
          return;
        }

        const previousRank = previousEntries.findIndex((entry) => entry.user_id === user.id);
        if (previousRank === -1) {
          return;
        }

        const rank = previousRank + 1;
        const rewardXp = getLeagueRewardForRank(rank);
        if (rewardXp <= 0) {
          return;
        }

        claimLeagueReward(rank, previousSeason.seasonKey)
          .then((claimedXp) => {
            if (cancelled || claimedXp <= 0) {
              return;
            }
            setRewardMessage(isEnglish
              ? `You received ${claimedXp} XP for finishing ${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} in the league.`
              : `${rank}위 리그 보상으로 ${claimedXp} XP를 받았어요.`);
            markLeagueRewardSeen(previousSeason.seasonKey);
          })
          .catch((claimError) => {
            console.error('League reward claim failed:', claimError);
          });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [
    claimLeagueReward,
    currentSeasonKey,
    markLeagueRewardSeen,
    progress,
    streakStatus.leagueRewardClaimedRank,
    streakStatus.leagueRewardClaimedSeasonKey,
    streakStatus.leagueRewardClaimedXp,
    streakStatus.leagueRewardSeenSeasonKey,
    user?.id,
    isEnglish,
  ]);

  const openProfile = async (entry) => {
    setSelectedEntry(entry);
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileData(null);

    try {
      const nextProfile = await fetchLeaderboardProfile(entry.user_id);
      setProfileData(nextProfile);
    } catch (profileError) {
      console.error('Leaderboard profile fetch failed:', profileError);
      setProfileData({ profile: entry, seasons: [entry] });
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="px-5 pt-14 pb-8 min-h-screen">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Medal className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{isEnglish ? 'Finapple League' : '파이내플 리그'}</h1>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 mt-3">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <p className="text-[12px] font-semibold text-primary">{isEnglish ? 'This season' : '이번 시즌'}</p>
                <p className="text-[14px] font-bold text-foreground mt-0.5">{seasonLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">{isEnglish ? 'Scores combine this week’s XP, streak, completed quizzes, and resolved wrong answers.' : '점수는 이번 주 XP, 스트릭, 이번 주 완료 퀴즈, 이번 주 해결 오답을 합산해 계산돼요.'}</p>
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
              <p className="text-[12px] font-semibold text-primary">{isEnglish ? 'My rank' : '내 랭킹'}</p>
              <div className="mt-2 flex items-end gap-3 flex-wrap">
                <h2 className="text-3xl font-extrabold text-foreground">{myRank ? `#${myRank}` : '-'}</h2>
                <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 border border-primary/15 shadow-sm">
                  <span className="text-[11px] font-semibold text-primary">{isEnglish ? 'Season points' : '시즌 포인트'}</span>
                  <span className="text-xl leading-none font-black text-foreground">
                    {(mySyncedEntry?.score ?? myEntry.score).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{isEnglish ? 'Your overall learning history stays, and only league points reset weekly.' : '누적 학습 기록은 유지되고 리그 포인트만 주간 초기화돼요.'}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isEnglish ? `This week's XP ${(mySyncedEntry?.xp ?? myEntry.xp).toLocaleString()}` : `이번 주 XP ${(mySyncedEntry?.xp ?? myEntry.xp).toLocaleString()}`}
              </p>
              <p className="text-[11px] text-primary mt-2">
                {isEnglish
                  ? `Projected reward at your current rank: ${rewardPreview > 0 ? `${rewardPreview} XP` : 'Outside reward range'}`
                  : `현재 순위 예상 리그 보상: ${rewardPreview > 0 ? `${rewardPreview} XP` : '보상 구간 밖'}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 border border-border">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[12px] font-bold text-foreground">{isEnglish ? `${streakStatus.streakCount} days` : `${streakStatus.streakCount}일`}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 border border-border">
                <Snowflake className="w-4 h-4 text-sky-500" />
                <span className="text-[12px] font-bold text-foreground">{isEnglish ? `${streakStatus.streakFreezers}` : `${streakStatus.streakFreezers}개`}</span>
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
              {isEnglish ? 'Apply `supabase/leaderboard_entries.sql` to your DB and try again.' : '`supabase/leaderboard_entries.sql`을 DB에 적용한 뒤 다시 확인해주세요.'}
            </p>
          </div>
        ) : remoteLoading && normalizedEntries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
            {isEnglish ? 'Loading leaderboard...' : '리더보드를 불러오는 중...'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => {
              const topRankStyle = TOP_RANK_STYLES[entry.rank];

              return (
                <button
                  type="button"
                  key={entry.user_id}
                  onClick={() => openProfile(entry)}
                  className={`w-full rounded-2xl border p-4 flex items-center gap-4 text-left transition-all hover:shadow-md ${
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
                          {isEnglish ? 'Me' : '나'}
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
                      {isEnglish
                        ? `This week's XP ${entry.xp.toLocaleString()} · Streak ${entry.streak_count} days · Resolved wrong answers ${entry.resolved_review_count}`
                        : `이번 주 XP ${entry.xp.toLocaleString()} · 스트릭 ${entry.streak_count}일 · 이번 주 해결한 오답 ${entry.resolved_review_count}개`}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {(() => {
                        const trackScores = getEntryTrackScores(entry);
                        return isEnglish
                          ? `Youth ${trackScores.youth.toLocaleString()}P · Start ${trackScores.start.toLocaleString()}P · One ${trackScores.one.toLocaleString()}P`
                          : `Youth ${trackScores.youth.toLocaleString()}P · Start ${trackScores.start.toLocaleString()}P · One ${trackScores.one.toLocaleString()}P`;
                      })()}
                    </p>
                  </div>
                  {topRankStyle ? (
                    <Crown className={`w-5 h-5 flex-shrink-0 ${topRankStyle.iconClassName}`} />
                  ) : entry.isMe ? <Star className="w-5 h-5 text-accent fill-accent flex-shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <LeaderboardProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profileData={profileData}
        loading={profileLoading}
        fallbackEntry={selectedEntry}
        isEnglish={isEnglish}
      />
    </>
  );
}
