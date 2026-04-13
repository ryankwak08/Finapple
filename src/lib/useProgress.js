import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/services/authService';
import { getAdsDisabled, getIsPremium } from '@/lib/premium';
import { TOTAL_QUIZ_COUNT } from '@/lib/quizCatalog';
import { getCurrentSeasonMeta } from '@/lib/season';
import { buildLeaderboardPayload, getLeagueRewardForRank } from '@/lib/leaderboard';
import { syncLeaderboardEntry } from '@/api/leaderboardClient';
import { consumeCurrentUserHeart, fetchCurrentUserState } from '@/api/adminClient';
import { safeStorage } from '@/lib/safeStorage';
import { useTrack } from '@/lib/trackContext';
import { allocateTrackLeaderboardScores } from '@/lib/leaderboardTrackScores';

const TODAY = () => new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'finapple_progress';
const PREMIUM_FREEZER_COUNT = 3;
const PREMIUM_FREEZER_GRANT_VERSION = 1;
const PROGRESS_UPDATED_EVENT = 'finapple:progress-updated';
const FREEZER_HISTORY_LIMIT = 5;

const trimFreezerHistory = (history = []) => history.slice(0, FREEZER_HISTORY_LIMIT);

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
  league_reward_seen_season_key: '',
  premium_freezer_grant_version: 0,
});

const normalizeReviewNote = (entry) => ({
  ...entry,
  status: entry.status || 'wrong',
  resolvedAt: entry.resolvedAt || null,
});

const normalizeQuizScoreEntry = (entry) => {
  if (entry && typeof entry === 'object') {
    return {
      score: Number(entry.score) || 0,
      total: Math.max(1, Number(entry.total) || 5),
    };
  }

  if (entry === null || entry === undefined) {
    return null;
  }

  return {
    score: Number(entry) || 0,
    total: 5,
  };
};

const getDaysBetween = (from, to) => {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const shiftDate = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const getDateFromIso = (value) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

const hasUsedAutoFreezerToday = (progress, today) => {
  const history = progress.streak_freezer_history || [];
  return history.some((entry) => (
    entry?.status === 'used_auto' &&
    getDateFromIso(entry?.consumedAt) === today
  ));
};

const consumeAutoFreezers = (progress, today) => {
  const lastActiveDate = progress.last_active_date;
  if (!lastActiveDate) {
    return { next: progress, consumedDays: 0 };
  }

  const daysBetween = getDaysBetween(lastActiveDate, today);
  if (daysBetween <= 1) {
    return { next: progress, consumedDays: 0 };
  }

  const missedDays = daysBetween - 1;
  const availableFreezers = progress.streak_freezers || 0;
  if (hasUsedAutoFreezerToday(progress, today)) {
    return { next: progress, consumedDays: 0 };
  }

  const consumedDays = Math.min(missedDays, availableFreezers, 1);

  if (consumedDays <= 0) {
    return { next: progress, consumedDays: 0 };
  }

  const now = new Date().toISOString();
  const historyEntries = Array.from({ length: consumedDays }, (_, index) => ({
    activatedAt: now,
    status: 'used_auto',
    consumedAt: `${shiftDate(lastActiveDate, index + 1)}T00:00:00.000Z`,
  }));

  return {
    consumedDays,
    next: {
      ...progress,
      streak_freezers: availableFreezers - consumedDays,
      streak_freezer_history: trimFreezerHistory([
        ...historyEntries,
        ...(progress.streak_freezer_history || []),
      ]),
      last_active_date: shiftDate(lastActiveDate, consumedDays),
    },
  };
};

const syncDailyProgress = (progress, premiumUser, adsDisabled) => {
  const today = TODAY();
  const next = {
    ...progress,
    streak_count: progress.streak_count || 1,
    best_streak: progress.best_streak || progress.streak_count || 1,
    streak_freezers: progress.streak_freezers ?? (premiumUser ? PREMIUM_FREEZER_COUNT : 0),
    streak_freezer_shield_active: false,
    streak_freezer_activated_at: null,
    streak_freezer_expires_at: null,
    streak_freezer_history: progress.streak_freezer_history || [],
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
    const freezerSync = consumeAutoFreezers(next, today);
    Object.assign(next, freezerSync.next);

    const daysBetweenAfterFreezer = getDaysBetween(next.last_active_date, today);
    if (daysBetweenAfterFreezer > 1) {
      next.streak_count = 1;
      next.best_streak = Math.max(progress.best_streak || 0, next.streak_count);
      changed = true;
    } else if (freezerSync.consumedDays > 0) {
      changed = true;
    }
  }

  if ((progress.ads_disabled ?? false) !== adsDisabled) {
    next.ads_disabled = adsDisabled;
    changed = true;
  }

  if (
    progress.streak_freezer_shield_active ||
    progress.streak_freezer_activated_at ||
    progress.streak_freezer_expires_at
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
  const { activeTrack } = useTrack();

  const syncLeaderboardForProgress = useCallback((nextProgress, nextUser = user) => {
    if (!nextProgress || !nextUser?.email) {
      return;
    }

    const seasonMeta = getCurrentSeasonMeta();
    const streakStatus = {
      streakCount: nextProgress.streak_count || 1,
      bestStreak: nextProgress.best_streak || 1,
      streakFreezers: nextProgress.streak_freezers || 0,
      adsDisabled: Boolean(nextProgress.ads_disabled),
      leaderboardSeasonKey: nextProgress.leaderboard_season_key || seasonMeta.seasonKey,
      leaderboardSeasonLabel: nextProgress.leaderboard_season_label || seasonMeta.label,
      leaderboardSeasonStartDate: nextProgress.leaderboard_season_start_date || seasonMeta.startDate,
      leaderboardSeasonEndDate: nextProgress.leaderboard_season_end_date || seasonMeta.endDate,
    };

    const basePayload = buildLeaderboardPayload({
      user: nextUser,
      progress: nextProgress,
      streakStatus,
    });

    const trackScores = allocateTrackLeaderboardScores({
      user: nextUser,
      seasonKey: basePayload.seasonKey,
      totalScore: basePayload.score,
      activeTrack,
    });

    const payload = {
      ...basePayload,
      trackScores,
    };

    syncLeaderboardEntry(payload).catch((error) => {
      console.error('Leaderboard background sync failed:', error);
    });
  }, [activeTrack, user]);

  const persistProgress = useCallback((nextProgress) => {
    const { next } = syncLeaderboardSeasonProgress(nextProgress);
    setProgress(next);
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: next }));
  }, []);

  const getLatestProgressSnapshot = useCallback(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return progress;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        return progress;
      }

      const next = {
        ...getDefaultProgress(parsed.user_email || user?.email || 'guest'),
        ...parsed,
        quiz_scores: Object.fromEntries(
          Object.entries(parsed.quiz_scores || {}).map(([quizId, entry]) => [quizId, normalizeQuizScoreEntry(entry)])
        ),
        review_notes: (parsed.review_notes || []).map(normalizeReviewNote),
      };

      if (user?.email && parsed.user_email === user.email && progress) {
        next.hearts = progress.hearts;
        next.hearts_last_reset = progress.hearts_last_reset;
      }

      return next;
    } catch {
      return progress;
    }
  }, [progress, user?.email]);

  const applyProgressUpdate = useCallback((updater) => {
    const current = getLatestProgressSnapshot();
    if (!current) {
      return null;
    }

    const next = updater(current);
    if (!next) {
      return current;
    }

    persistProgress(next);
    return next;
  }, [getLatestProgressSnapshot, persistProgress]);

  const loadProgress = useCallback(async () => {
    try {
      const me = await getCurrentUser().catch(() => null);
      setUser(me);
      const premiumUser = getIsPremium(me);
      const adsDisabled = getAdsDisabled(me);
      const remoteState = me?.email
        ? await fetchCurrentUserState().catch((error) => {
            console.error('Failed to fetch remote user state', error);
            return null;
          })
        : null;

      const savedProgress = JSON.parse(safeStorage.getItem(STORAGE_KEY) || 'null');
      if (savedProgress && savedProgress.user_email === me?.email) {
        let p = {
          ...getDefaultProgress(me?.email || 'guest'),
          ...savedProgress,
          quiz_scores: Object.fromEntries(
            Object.entries(savedProgress.quiz_scores || {}).map(([quizId, entry]) => [quizId, normalizeQuizScoreEntry(entry)])
          ),
          review_notes: (savedProgress.review_notes || []).map(normalizeReviewNote),
        };
        if (remoteState) {
          p = {
            ...p,
            hearts: remoteState.hearts ?? p.hearts,
            hearts_last_reset: remoteState.heartsLastReset || p.hearts_last_reset,
          };
        }
        if (premiumUser) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        } else if (shouldResetHearts(p.hearts_last_reset)) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        }
        const { next, changed } = syncDailyProgress(p, premiumUser, adsDisabled);
        const seasonSync = syncLeaderboardSeasonProgress(next);
        setProgress(seasonSync.next);
        if (changed || seasonSync.changed) {
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(seasonSync.next));
        }
      } else {
        const remoteSeed = remoteState
          ? {
              hearts: remoteState.hearts ?? 5,
              hearts_last_reset: remoteState.heartsLastReset || TODAY(),
            }
          : {};

        const newProgress = syncLeaderboardSeasonProgress({
          ...getDefaultProgress(me?.email || 'guest'),
          ...remoteSeed,
          streak_freezers: premiumUser ? PREMIUM_FREEZER_COUNT : 0,
          ads_disabled: adsDisabled,
          premium_freezer_grant_version: premiumUser ? PREMIUM_FREEZER_GRANT_VERSION : 0,
        }).next;
        setProgress(newProgress);
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
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

  const loseHeart = useCallback(async () => {
    if (getIsPremium(user)) return progress?.hearts ?? 5;
    const remoteState = await consumeCurrentUserHeart().catch((error) => {
      console.error('Failed to consume remote heart', error);
      return null;
    });

    if (!remoteState) {
      const next = applyProgressUpdate((current) => {
        if (!current || current.hearts <= 0) {
          return current;
        }

        return { ...current, hearts: current.hearts - 1 };
      });

      return next?.hearts ?? 0;
    }

    const next = applyProgressUpdate((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        hearts: remoteState.hearts ?? current.hearts,
        hearts_last_reset: remoteState.heartsLastReset || current.hearts_last_reset,
      };
    });

    return next?.hearts ?? remoteState.hearts ?? 0;
  }, [applyProgressUpdate, progress?.hearts, user]);

  const recordWrongAnswer = useCallback(async ({
    quizId,
    quizTitle,
    unitId,
    unitTitle,
    question,
    selectedAnswer,
    questionType = 'quiz',
  }) => {
    if (!question) return;

    applyProgressUpdate((current) => {
      if (!current) return current;

      const reviewId = createQuestionReviewId(quizId, question);
      const existingNotes = current.review_notes || [];
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

      return { ...current, review_notes: reviewNotes };
    });
  }, [applyProgressUpdate]);

  const resolveWrongAnswer = useCallback(async (reviewId) => {
    const next = applyProgressUpdate((current) => {
      if (!current) return current;
      const reviewNotes = (current.review_notes || []).map((entry) => (
        entry.id === reviewId
          ? {
              ...entry,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : entry
      ));
      return { ...current, review_notes: reviewNotes };
    });
    syncLeaderboardForProgress(next);
  }, [applyProgressUpdate, syncLeaderboardForProgress]);

  const completeQuiz = useCallback(async (quizId, score, xpReward, totalQuestions = 5) => {
    const next = applyProgressUpdate((current) => {
      if (!current) return current;
      const completed = current.completed_quizzes || [];
      const scores = current.quiz_scores || {};
      const isNew = !completed.includes(quizId);
      const currentScoreEntry = normalizeQuizScoreEntry(scores[quizId]);
      const bestScore = Math.max(currentScoreEntry?.score || 0, score);
      const nextScoreEntry = {
        score: bestScore,
        total: Math.max(currentScoreEntry?.total || 0, totalQuestions, 1),
      };

      return {
        ...current,
        completed_quizzes: isNew ? [...completed, quizId] : completed,
        quiz_scores: { ...scores, [quizId]: nextScoreEntry },
        xp: isNew ? (current.xp || 0) + xpReward : (current.xp || 0),
      };
    });
    syncLeaderboardForProgress(next);
  }, [applyProgressUpdate, syncLeaderboardForProgress]);

  const recordQuizActivity = useCallback(async () => {
    const next = applyProgressUpdate((current) => {
      if (!current) return current;

      const today = TODAY();
      const freezerApplied = consumeAutoFreezers(current, today);
      const base = freezerApplied.next;
      const lastActiveDate = base.last_active_date;

      if (!lastActiveDate) {
        return {
          ...base,
          last_active_date: today,
          streak_count: 1,
          best_streak: Math.max(base.best_streak || 1, 1),
        };
      }

      const daysBetween = getDaysBetween(lastActiveDate, today);

      if (daysBetween <= 0) {
        return base;
      }

      if (daysBetween === 1) {
        const nextStreakCount = (base.streak_count || 0) + 1;
        return {
          ...base,
          last_active_date: today,
          streak_count: nextStreakCount,
          best_streak: Math.max(base.best_streak || 0, nextStreakCount),
        };
      }

      return {
        ...clearFreezerShieldState(base),
        last_active_date: today,
        streak_count: 1,
        best_streak: Math.max(base.best_streak || 1, 1),
      };
    });
    syncLeaderboardForProgress(next);
  }, [applyProgressUpdate, syncLeaderboardForProgress]);

  const purchaseShopItem = useCallback(async (item) => {
    const current = getLatestProgressSnapshot();
    if (!current) {
      throw new Error('진행 정보를 불러오는 중입니다.');
    }

    const currentXp = current.xp || 0;
    if (currentXp < item.price) {
      throw new Error(`${item.price.toLocaleString()} XP가 필요해요.`);
    }

    let snapshot;
    applyProgressUpdate((base) => {
      const inventory = { ...(base.inventory || {}) };
      inventory[item.id] = (inventory[item.id] || 0) + 1;

      let nextProgress = {
        ...base,
        xp: Math.max(0, (base.xp || 0) - item.price),
        inventory,
      };

      if (item.rewardType === 'streak_freezer') {
        nextProgress = {
          ...nextProgress,
          streak_freezers: (base.streak_freezers || 0) + (item.rewardValue || 1),
        };
      }

      snapshot = nextProgress;
      return nextProgress;
    });

    return snapshot;
  }, [applyProgressUpdate, getLatestProgressSnapshot]);

  const activateStreakFreezer = useCallback(async () => {
    throw new Error('Streak Freezer는 스트릭이 깨질 때 자동으로 사용됩니다.');
  }, []);

  const claimLeagueReward = useCallback(async (rank, seasonKey) => {
    if (!seasonKey) {
      return 0;
    }

    const current = getLatestProgressSnapshot();
    if (!current || current.league_reward_claimed_season_key === seasonKey) {
      return 0;
    }

    const rewardXp = getLeagueRewardForRank(rank);
    const next = applyProgressUpdate((base) => ({
      ...base,
      xp: (base.xp || 0) + rewardXp,
      leaderboard_xp_baseline: (base.leaderboard_xp_baseline || 0) + rewardXp,
      league_reward_claimed_season_key: seasonKey,
      league_reward_claimed_rank: rank || null,
      league_reward_claimed_xp: rewardXp,
    }));
    syncLeaderboardForProgress(next);
    return rewardXp;
  }, [applyProgressUpdate, getLatestProgressSnapshot, syncLeaderboardForProgress]);

  const awardXp = useCallback(async (amount) => {
    const normalized = Number(amount) || 0;
    if (normalized <= 0) {
      return progress?.xp || 0;
    }

    const next = applyProgressUpdate((base) => ({
      ...base,
      xp: (base.xp || 0) + normalized,
    }));
    syncLeaderboardForProgress(next);
    return next?.xp || 0;
  }, [applyProgressUpdate, progress?.xp, syncLeaderboardForProgress]);

  const isUnitLocked = useCallback((unitId) => {
    return false;
  }, [progress]);

  const isQuizCompleted = useCallback((quizId) => {
    return (progress?.completed_quizzes || []).includes(quizId);
  }, [progress]);

  const getQuizScore = useCallback((quizId) => {
    return normalizeQuizScoreEntry((progress?.quiz_scores || {})[quizId]);
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
    const totalQuizzes = TOTAL_QUIZ_COUNT;
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
      leagueRewardSeenSeasonKey: progress?.league_reward_seen_season_key || '',
    };
  }, [progress]);

  const getInventoryCount = useCallback((itemId) => {
    return (progress?.inventory || {})[itemId] || 0;
  }, [progress]);

  const markLeagueRewardSeen = useCallback((seasonKey) => {
    if (!seasonKey) {
      return;
    }

    applyProgressUpdate((base) => {
      if (!base || base.league_reward_seen_season_key === seasonKey) {
        return base;
      }

      return {
        ...base,
        league_reward_seen_season_key: seasonKey,
      };
    });
  }, [applyProgressUpdate]);

  return {
    progress,
    loading,
    user,
    isPremium: getIsPremium(user),
    loseHeart,
    recordWrongAnswer,
    resolveWrongAnswer,
    completeQuiz,
    recordQuizActivity,
    purchaseShopItem,
    activateStreakFreezer,
    claimLeagueReward,
    awardXp,
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
    markLeagueRewardSeen,
    reload: loadProgress
  };
}
