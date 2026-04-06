import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/services/authService';
import { getAdsDisabled, getIsPremium } from '@/lib/premium';
import { quizUnits } from '@/lib/quizData';
import { getCurrentSeasonMeta } from '@/lib/season';
import { getLeagueRewardForRank } from '@/lib/leaderboard';

const TODAY = () => new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'finapple_progress';
const PREMIUM_FREEZER_COUNT = 3;
const PREMIUM_FREEZER_GRANT_VERSION = 1;
const PROGRESS_UPDATED_EVENT = 'finapple:progress-updated';
const FREEZER_HISTORY_LIMIT = 5;

const buildFreezerExpiryAt = (activatedAt) => {
  return new Date(new Date(activatedAt).getTime() + (24 * 60 * 60 * 1000)).toISOString();
};

const trimFreezerHistory = (history = []) => history.slice(0, FREEZER_HISTORY_LIMIT);

const finalizeFreezerHistoryEntry = (history = [], activatedAt, updates) => (
  trimFreezerHistory(history.map((entry) => (
    entry.activatedAt === activatedAt
      ? { ...entry, ...updates }
      : entry
  )))
);

const clearFreezerShieldState = (progress, nextHistory = progress.streak_freezer_history || []) => ({
  ...progress,
  streak_freezer_shield_active: false,
  streak_freezer_activated_at: null,
  streak_freezer_expires_at: null,
  streak_freezer_history: trimFreezerHistory(nextHistory),
});

const createQuestionReviewId = (quizId, question) => {
  const source = `${quizId}:${question?.question || ''}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return `review_${Math.abs(hash)}`;
};

const getDefaultProgress = (userEmail = 'guest') => ({
  user_email: userEmail,
  xp: 0,
  hearts: 5,
  hearts_last_reset: TODAY(),
  streak_count: 1,
  best_streak: 1,
  last_active_date: TODAY(),
  streak_freezers: 0,
  ads_disabled: false,
  inventory: {},
  completed_quizzes: [],
  quiz_scores: {},
  review_notes: [],
  streak_freezer_shield_active: false,
  streak_freezer_activated_at: null,
  streak_freezer_expires_at: null,
  streak_freezer_history: [],
  leaderboard_season_key: getCurrentSeasonMeta().seasonKey,
  leaderboard_season_label: getCurrentSeasonMeta().label,
  leaderboard_season_start_date: getCurrentSeasonMeta().startDate,
  leaderboard_season_end_date: getCurrentSeasonMeta().endDate,
  leaderboard_xp_baseline: 0,
  leaderboard_completed_baseline: 0,
  leaderboard_resolved_review_baseline: 0,
  league_reward_claimed_season_key: '',
  league_reward_claimed_rank: null,
  league_reward_claimed_xp: 0,
  premium_freezer_grant_version: 0,
});

const normalizeReviewNote = (entry) => ({
  ...entry,
  status: entry.status || 'wrong',
  resolvedAt: entry.resolvedAt || null,
});

const getDaysBetween = (from, to) => {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const syncDailyProgress = (progress, premiumUser, adsDisabled) => {
  const today = TODAY();
  const activeShieldActivatedAt = progress.streak_freezer_activated_at || new Date().toISOString();
  const expectedShieldExpiresAt = progress.streak_freezer_shield_active
    ? buildFreezerExpiryAt(activeShieldActivatedAt)
    : null;
  const activeShieldExpiresAt = progress.streak_freezer_shield_active
    ? expectedShieldExpiresAt
    : null;
  const activeShieldExpired = Boolean(
    progress.streak_freezer_shield_active &&
    activeShieldExpiresAt &&
    Date.now() > new Date(activeShieldExpiresAt).getTime()
  );
  const next = {
    ...progress,
    streak_count: progress.streak_count || 1,
    best_streak: progress.best_streak || progress.streak_count || 1,
    streak_freezers: progress.streak_freezers ?? (premiumUser ? PREMIUM_FREEZER_COUNT : 0),
    streak_freezer_shield_active: Boolean(progress.streak_freezer_shield_active) && !activeShieldExpired,
    streak_freezer_activated_at: progress.streak_freezer_shield_active && !activeShieldExpired
      ? activeShieldActivatedAt
      : null,
    streak_freezer_expires_at: progress.streak_freezer_shield_active && !activeShieldExpired
      ? activeShieldExpiresAt
      : null,
    streak_freezer_history: activeShieldExpired && progress.streak_freezer_activated_at
      ? finalizeFreezerHistoryEntry(
          progress.streak_freezer_history || [],
          progress.streak_freezer_activated_at,
          {
            status: 'expired',
            expiredAt: progress.streak_freezer_expires_at || new Date().toISOString(),
          },
        )
      : (progress.streak_freezer_history || []),
    last_active_date: progress.last_active_date || today,
    ads_disabled: adsDisabled,
  };

  let changed = false;

  if (!progress.last_active_date) {
    next.last_active_date = today;
    next.streak_count = 1;
    next.best_streak = Math.max(next.best_streak, 1);
    changed = true;
  } else {
    const daysBetween = getDaysBetween(progress.last_active_date, today);

    if (daysBetween === 1) {
      next.streak_count = (progress.streak_count || 0) + 1;
      next.best_streak = Math.max(progress.best_streak || 0, next.streak_count);
      next.last_active_date = today;
      changed = true;
    } else if (daysBetween > 1) {
      if (daysBetween === 2 && next.streak_freezer_shield_active) {
        const consumedHistory = finalizeFreezerHistoryEntry(
          next.streak_freezer_history,
          next.streak_freezer_activated_at,
          {
            status: 'used',
            consumedAt: new Date().toISOString(),
          },
        );
        Object.assign(next, clearFreezerShieldState(next, consumedHistory));
        next.last_active_date = today;
      } else {
        next.streak_count = 1;
        next.last_active_date = today;
        if (next.streak_freezer_shield_active) {
          const expiredHistory = finalizeFreezerHistoryEntry(
            next.streak_freezer_history,
            next.streak_freezer_activated_at,
            {
              status: 'expired',
              expiredAt: next.streak_freezer_expires_at || new Date().toISOString(),
            },
          );
          Object.assign(next, clearFreezerShieldState(next, expiredHistory));
        }
      }
      next.best_streak = Math.max(progress.best_streak || 0, next.streak_count);
      changed = true;
    }
  }

  if ((progress.ads_disabled ?? false) !== adsDisabled) {
    next.ads_disabled = adsDisabled;
    changed = true;
  }

  if (
    progress.streak_freezer_shield_active &&
    (
      progress.streak_freezer_activated_at !== next.streak_freezer_activated_at ||
      progress.streak_freezer_expires_at !== next.streak_freezer_expires_at ||
      progress.streak_freezer_expires_at !== expectedShieldExpiresAt
    )
  ) {
    changed = true;
  }

  if (premiumUser && (progress.premium_freezer_grant_version || 0) < PREMIUM_FREEZER_GRANT_VERSION) {
    next.streak_freezers = Math.max(progress.streak_freezers || 0, PREMIUM_FREEZER_COUNT);
    next.premium_freezer_grant_version = PREMIUM_FREEZER_GRANT_VERSION;
    changed = true;
  }

  return { next, changed };
};

const shouldResetHearts = (lastReset) => {
  if (!lastReset) return true;
  try {
    return lastReset !== TODAY();
  } catch {
    return true;
  }
};

const syncLeaderboardSeasonProgress = (progress) => {
  const season = getCurrentSeasonMeta();
  const resolvedReviewCount = (progress.review_notes || []).filter((entry) => entry.status === 'resolved').length;
  const completedCount = (progress.completed_quizzes || []).length;

  if (progress.leaderboard_season_key === season.seasonKey) {
    return { next: progress, changed: false };
  }

  return {
    changed: true,
    next: {
      ...progress,
      leaderboard_season_key: season.seasonKey,
      leaderboard_season_label: season.label,
      leaderboard_season_start_date: season.startDate,
      leaderboard_season_end_date: season.endDate,
      leaderboard_xp_baseline: progress.xp || 0,
      leaderboard_completed_baseline: completedCount,
      leaderboard_resolved_review_baseline: resolvedReviewCount,
    },
  };
};

export default function useProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const persistProgress = useCallback((nextProgress) => {
    const { next } = syncLeaderboardSeasonProgress(nextProgress);
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: next }));
  }, []);

  const loadProgress = useCallback(async () => {
    try {
      const me = await getCurrentUser().catch(() => null);
      setUser(me);
      const premiumUser = getIsPremium(me);
      const adsDisabled = getAdsDisabled(me);

      const savedProgress = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (savedProgress && savedProgress.user_email === me?.email) {
        let p = {
          ...getDefaultProgress(me?.email || 'guest'),
          ...savedProgress,
          review_notes: (savedProgress.review_notes || []).map(normalizeReviewNote),
        };
        if (premiumUser) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        } else if (shouldResetHearts(p.hearts_last_reset)) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        }
        const { next, changed } = syncDailyProgress(p, premiumUser, adsDisabled);
        const seasonSync = syncLeaderboardSeasonProgress(next);
        setProgress(seasonSync.next);
        if (changed || seasonSync.changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seasonSync.next));
        }
      } else {
        const newProgress = syncLeaderboardSeasonProgress({
          ...getDefaultProgress(me?.email || 'guest'),
          streak_freezers: premiumUser ? PREMIUM_FREEZER_COUNT : 0,
          ads_disabled: adsDisabled,
          premium_freezer_grant_version: premiumUser ? PREMIUM_FREEZER_GRANT_VERSION : 0,
        }).next;
        setProgress(newProgress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      }
    } catch (e) {
      console.error('Failed to load progress', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  useEffect(() => {
    const handleProgressUpdated = (event) => {
      if (!event.detail) {
        return;
      }

      setProgress(event.detail);
    };

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        const nextProgress = JSON.parse(event.newValue);
        setProgress(nextProgress);
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!progress?.streak_freezer_shield_active || !progress.streak_freezer_expires_at) {
      return;
    }

    const remainingMs = new Date(progress.streak_freezer_expires_at).getTime() - Date.now();

    if (remainingMs <= 0) {
      const expiredHistory = finalizeFreezerHistoryEntry(
        progress.streak_freezer_history || [],
        progress.streak_freezer_activated_at,
        {
          status: 'expired',
          expiredAt: progress.streak_freezer_expires_at,
        },
      );
      persistProgress(clearFreezerShieldState(progress, expiredHistory));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const expiredHistory = finalizeFreezerHistoryEntry(
        progress.streak_freezer_history || [],
        progress.streak_freezer_activated_at,
        {
          status: 'expired',
          expiredAt: progress.streak_freezer_expires_at,
        },
      );
      persistProgress(clearFreezerShieldState(progress, expiredHistory));
    }, remainingMs + 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [persistProgress, progress]);

  const loseHeart = useCallback(async () => {
    if (getIsPremium(user)) return progress?.hearts ?? 5;
    if (!progress || progress.hearts <= 0) return 0;
    const newHearts = progress.hearts - 1;
    const updated = { ...progress, hearts: newHearts };
    persistProgress(updated);
    return newHearts;
  }, [persistProgress, progress, user]);

  const recordWrongAnswer = useCallback(async ({
    quizId,
    quizTitle,
    unitId,
    unitTitle,
    question,
    selectedAnswer,
    questionType = 'quiz',
  }) => {
    if (!progress || !question) return;

    const reviewId = createQuestionReviewId(quizId, question);
    const existingNotes = progress.review_notes || [];
    const existing = existingNotes.find((entry) => entry.id === reviewId);
    const nextEntry = {
      id: reviewId,
      quizId,
      quizTitle,
      unitId,
      unitTitle,
      question,
      selectedAnswer,
      questionType,
      attempts: (existing?.attempts || 0) + 1,
      status: 'wrong',
      resolvedAt: null,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const reviewNotes = existing
      ? existingNotes.map((entry) => entry.id === reviewId ? nextEntry : entry)
      : [nextEntry, ...existingNotes];

    persistProgress({ ...progress, review_notes: reviewNotes });
  }, [persistProgress, progress]);

  const resolveWrongAnswer = useCallback(async (reviewId) => {
    if (!progress) return;
    const reviewNotes = (progress.review_notes || []).map((entry) => (
      entry.id === reviewId
        ? {
            ...entry,
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : entry
    ));
    persistProgress({ ...progress, review_notes: reviewNotes });
  }, [persistProgress, progress]);

  const completeQuiz = useCallback(async (quizId, score, xpReward) => {
    if (!progress) return;
    const completed = progress.completed_quizzes || [];
    const scores = progress.quiz_scores || {};
    const isNew = !completed.includes(quizId);
    const bestScore = Math.max(scores[quizId] || 0, score);
    
    const updates = {
      completed_quizzes: isNew ? [...completed, quizId] : completed,
      quiz_scores: { ...scores, [quizId]: bestScore },
      xp: isNew ? (progress.xp || 0) + xpReward : progress.xp
    };

    const updated = { ...progress, ...updates };
    persistProgress(updated);
  }, [persistProgress, progress]);

  const purchaseShopItem = useCallback(async (item) => {
    if (!progress) {
      throw new Error('진행 정보를 불러오는 중입니다.');
    }

    const currentXp = progress.xp || 0;
    if (currentXp < item.price) {
      throw new Error(`${item.price.toLocaleString()} XP가 필요해요.`);
    }

    const inventory = { ...(progress.inventory || {}) };
    inventory[item.id] = (inventory[item.id] || 0) + 1;

    let nextProgress = {
      ...progress,
      xp: currentXp - item.price,
      inventory,
    };

    if (item.rewardType === 'streak_freezer') {
      nextProgress = {
        ...nextProgress,
        streak_freezers: (progress.streak_freezers || 0) + (item.rewardValue || 1),
      };
    }

    persistProgress(nextProgress);
    return nextProgress;
  }, [persistProgress, progress]);

  const activateStreakFreezer = useCallback(async () => {
    if (!progress) {
      throw new Error('진행 정보를 불러오는 중입니다.');
    }

    if ((progress.streak_freezers || 0) <= 0) {
      throw new Error('사용 가능한 Streak Freezer가 없어요.');
    }

    if (progress.streak_freezer_shield_active) {
      throw new Error('이미 Freezer가 적용되어 있어요.');
    }

    const activatedAt = new Date().toISOString();
    const expiresAt = buildFreezerExpiryAt(activatedAt);
    const nextProgress = {
      ...progress,
      streak_freezers: Math.max((progress.streak_freezers || 0) - 1, 0),
      streak_freezer_shield_active: true,
      streak_freezer_activated_at: activatedAt,
      streak_freezer_expires_at: expiresAt,
      streak_freezer_history: trimFreezerHistory([
        {
          activatedAt,
          expiresAt,
          status: 'active',
        },
        ...(progress.streak_freezer_history || []),
      ]),
    };

    persistProgress(nextProgress);
    return nextProgress;
  }, [persistProgress, progress]);

  const claimLeagueReward = useCallback(async (rank, seasonKey) => {
    if (!progress || !seasonKey) {
      return 0;
    }

    if (progress.league_reward_claimed_season_key === seasonKey) {
      return 0;
    }

    const rewardXp = getLeagueRewardForRank(rank);
    const nextProgress = {
      ...progress,
      xp: (progress.xp || 0) + rewardXp,
      leaderboard_xp_baseline: (progress.leaderboard_xp_baseline || 0) + rewardXp,
      league_reward_claimed_season_key: seasonKey,
      league_reward_claimed_rank: rank || null,
      league_reward_claimed_xp: rewardXp,
    };

    persistProgress(nextProgress);
    return rewardXp;
  }, [persistProgress, progress]);

  const isUnitLocked = useCallback((unitId) => {
    if (unitId === 'unit1') return false;
    if (!progress) return true;
    const completed = progress.completed_quizzes || [];
    if (unitId === 'unit2') {
      return !['unit1-quiz1', 'unit1-quiz2', 'unit1-quiz3', 'unit1-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit3') {
      return !['unit2-quiz1', 'unit2-quiz2', 'unit2-quiz3', 'unit2-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit4') {
      return !['unit3-quiz1', 'unit3-quiz2', 'unit3-quiz3', 'unit3-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit5') {
      return !['unit4-quiz1', 'unit4-quiz2', 'unit4-quiz3', 'unit4-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit6') {
      return !['unit5-quiz1', 'unit5-quiz2', 'unit5-quiz3', 'unit5-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit7') {
      return !['unit6-quiz1', 'unit6-quiz2', 'unit6-quiz3', 'unit6-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit8') {
      return !['unit7-quiz1', 'unit7-quiz2', 'unit7-quiz3', 'unit7-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit9') {
      return !['unit8-quiz1', 'unit8-quiz2', 'unit8-quiz3', 'unit8-glossary'].every(q => completed.includes(q));
    }
    return true;
  }, [progress]);

  const isQuizCompleted = useCallback((quizId) => {
    return (progress?.completed_quizzes || []).includes(quizId);
  }, [progress]);

  const getQuizScore = useCallback((quizId) => {
    return (progress?.quiz_scores || {})[quizId] || null;
  }, [progress]);

  const getReviewNotes = useCallback(() => {
    return [...(progress?.review_notes || [])].sort((a, b) => (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
  }, [progress]);

  const getWrongReviewNotes = useCallback(() => {
    return getReviewNotes().filter((entry) => entry.status !== 'resolved');
  }, [getReviewNotes]);

  const getResolvedReviewNotes = useCallback(() => {
    return getReviewNotes().filter((entry) => entry.status === 'resolved');
  }, [getReviewNotes]);

  const getReviewNotesForQuiz = useCallback((quizId) => {
    return (progress?.review_notes || []).filter((entry) => (
      entry.quizId === quizId && entry.status !== 'resolved'
    ));
  }, [progress]);

  const getProgressSummary = useCallback(() => {
    const totalQuizzes = quizUnits.reduce((count, unit) => count + unit.quizzes.length + 1, 0);
    const completedCount = (progress?.completed_quizzes || []).length;
    const reviewCount = (progress?.review_notes || []).filter((entry) => entry.status !== 'resolved').length;
    const resolvedReviewCount = (progress?.review_notes || []).filter((entry) => entry.status === 'resolved').length;
    const completionRate = totalQuizzes > 0
      ? Math.round((completedCount / totalQuizzes) * 100)
      : 0;

    return {
      totalQuizzes,
      completedCount,
      reviewCount,
      resolvedReviewCount,
      completionRate,
    };
  }, [progress]);

  const getStreakStatus = useCallback(() => {
    return {
      streakCount: progress?.streak_count || 1,
      bestStreak: progress?.best_streak || 1,
      lastActiveDate: progress?.last_active_date || TODAY(),
      streakFreezers: progress?.streak_freezers || 0,
      freezerShieldActive: Boolean(progress?.streak_freezer_shield_active),
      freezerActivatedAt: progress?.streak_freezer_activated_at || null,
      freezerExpiresAt: progress?.streak_freezer_expires_at || null,
      freezerHistory: progress?.streak_freezer_history || [],
      adsDisabled: Boolean(progress?.ads_disabled),
      leaderboardSeasonKey: progress?.leaderboard_season_key || getCurrentSeasonMeta().seasonKey,
      leaderboardSeasonLabel: progress?.leaderboard_season_label || getCurrentSeasonMeta().label,
      leaderboardSeasonStartDate: progress?.leaderboard_season_start_date || getCurrentSeasonMeta().startDate,
      leaderboardSeasonEndDate: progress?.leaderboard_season_end_date || getCurrentSeasonMeta().endDate,
      leagueRewardClaimedSeasonKey: progress?.league_reward_claimed_season_key || '',
      leagueRewardClaimedRank: progress?.league_reward_claimed_rank || null,
      leagueRewardClaimedXp: progress?.league_reward_claimed_xp || 0,
    };
  }, [progress]);

  const getInventoryCount = useCallback((itemId) => {
    return (progress?.inventory || {})[itemId] || 0;
  }, [progress]);

  return {
    progress,
    loading,
    user,
    isPremium: getIsPremium(user),
    loseHeart,
    recordWrongAnswer,
    resolveWrongAnswer,
    completeQuiz,
    purchaseShopItem,
    activateStreakFreezer,
    claimLeagueReward,
    isUnitLocked,
    isQuizCompleted,
    getQuizScore,
    getReviewNotes,
    getWrongReviewNotes,
    getResolvedReviewNotes,
    getReviewNotesForQuiz,
    getProgressSummary,
    getStreakStatus,
    getInventoryCount,
    reload: loadProgress
  };
}
