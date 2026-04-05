import { getCurrentSeasonMeta } from '@/lib/season';

export function buildLeagueScore({
  xp = 0,
  streakCount = 1,
  completedCount = 0,
  resolvedReviewCount = 0,
}) {
  return xp + (streakCount * 120) + (completedCount * 35) + (resolvedReviewCount * 20);
}

export function buildLeaderboardPayload({ user, progress, streakStatus }) {
  const season = getCurrentSeasonMeta();
  const reviewNotes = progress?.review_notes || [];
  const totalActiveReviewCount = reviewNotes.filter((entry) => entry.status !== 'resolved').length;
  const totalResolvedReviewCount = reviewNotes.filter((entry) => entry.status === 'resolved').length;
  const totalCompletedCount = (progress?.completed_quizzes || []).length;
  const seasonXp = Math.max(0, (progress?.xp || 0) - (progress?.leaderboard_xp_baseline || 0));
  const seasonCompletedCount = Math.max(
    0,
    totalCompletedCount - (progress?.leaderboard_completed_baseline || 0)
  );
  const seasonResolvedReviewCount = Math.max(
    0,
    totalResolvedReviewCount - (progress?.leaderboard_resolved_review_baseline || 0)
  );
  const nickname = user?.user_metadata?.nickname?.trim();
  const fullName = user?.user_metadata?.full_name?.trim();
  const displayName =
    nickname ||
    fullName ||
    user?.email?.split('@')[0] ||
    '학습자';

  return {
    displayName,
    avatarUrl: user?.user_metadata?.profile_picture || user?.profile_picture || '',
    seasonKey: season.seasonKey,
    seasonLabel: season.label,
    seasonStartDate: season.startDate,
    seasonEndDate: season.endDate,
    xp: seasonXp,
    totalXp: progress?.xp || 0,
    streakCount: streakStatus?.streakCount || 1,
    bestStreak: streakStatus?.bestStreak || 1,
    streakFreezers: streakStatus?.streakFreezers || 0,
    completedCount: seasonCompletedCount,
    activeReviewCount: totalActiveReviewCount,
    resolvedReviewCount: seasonResolvedReviewCount,
    adsDisabled: Boolean(streakStatus?.adsDisabled),
    score: buildLeagueScore({
      xp: seasonXp,
      streakCount: streakStatus?.streakCount || 1,
      completedCount: seasonCompletedCount,
      resolvedReviewCount: seasonResolvedReviewCount,
    }),
  };
}
