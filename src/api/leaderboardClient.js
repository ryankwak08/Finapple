import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';
import { getCurrentSeasonMeta } from '@/lib/season';

const USE_DIRECT_SUPABASE = import.meta.env.DEV;
const REQUEST_TIMEOUT_MS = 8000;
const LEADERBOARD_PAGE_SIZE = 1000;
const LEADERBOARD_SELECT_BASE = 'user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at';
const LEADERBOARD_SELECT_WITH_TRACKS = `${LEADERBOARD_SELECT_BASE}, score_youth, score_start, score_one`;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function withTimeout(promise, message = '요청 시간이 초과되었습니다.') {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isTrackScoreColumnMissing(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (
    error?.code === '42703' ||
    message.includes('score_youth') ||
    message.includes('score_start') ||
    message.includes('score_one') ||
    details.includes('score_youth') ||
    details.includes('score_start') ||
    details.includes('score_one')
  );
}

async function syncLeaderboardEntryDirect(entry, session) {
  const user = session?.user;
  if (!user?.id || !user?.email) {
    throw new Error('리더보드 동기화에 필요한 사용자 정보가 없습니다.');
  }

  const payload = {
    user_id: user.id,
    user_email: user.email,
    display_name: entry.displayName,
    avatar_url: entry.avatarUrl || '',
    season_key: entry.seasonKey,
    season_label: entry.seasonLabel,
    season_start_date: entry.seasonStartDate,
    season_end_date: entry.seasonEndDate,
    xp: entry.xp || 0,
    streak_count: entry.streakCount || 1,
    best_streak: entry.bestStreak || 1,
    streak_freezers: entry.streakFreezers || 0,
    completed_count: entry.completedCount || 0,
    active_review_count: entry.activeReviewCount || 0,
    resolved_review_count: entry.resolvedReviewCount || 0,
    ads_disabled: Boolean(entry.adsDisabled),
    score: entry.score || 0,
    score_youth: entry.trackScores?.youth || 0,
    score_start: entry.trackScores?.start || 0,
    score_one: entry.trackScores?.one || 0,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await withTimeout(
    supabase
      .from('leaderboard_entries')
      .upsert(payload, { onConflict: 'user_id' })
      .select(LEADERBOARD_SELECT_WITH_TRACKS)
      .single(),
    '리더보드 동기화가 지연되고 있습니다.'
  );

  if (error && isTrackScoreColumnMissing(error)) {
    const { score_youth, score_start, score_one, ...legacyPayload } = payload;
    const fallback = await withTimeout(
      supabase
        .from('leaderboard_entries')
        .upsert(legacyPayload, { onConflict: 'user_id' })
        .select(LEADERBOARD_SELECT_BASE)
        .single(),
      '리더보드 동기화가 지연되고 있습니다.'
    );

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  await supabase
    .from('leaderboard_entry_history')
    .upsert(payload, { onConflict: 'user_id,season_key' })
    .select()
    .single()
    .catch(() => null);

  return data;
}

async function fetchLeaderboardDirect(limit = 20, seasonKey = getCurrentSeasonMeta().seasonKey) {
  const entries = [];

  for (let from = 0; from < limit; from += LEADERBOARD_PAGE_SIZE) {
    const to = Math.min(from + LEADERBOARD_PAGE_SIZE - 1, limit - 1);
    let { data, error } = await withTimeout(
      supabase
        .from('leaderboard_entries')
        .select(LEADERBOARD_SELECT_WITH_TRACKS)
        .eq('season_key', seasonKey)
        .order('score', { ascending: false })
        .order('updated_at', { ascending: true })
        .range(from, to),
      '리더보드 조회가 지연되고 있습니다.'
    );

    if (error && isTrackScoreColumnMissing(error)) {
      const fallback = await withTimeout(
        supabase
          .from('leaderboard_entries')
          .select(LEADERBOARD_SELECT_BASE)
          .eq('season_key', seasonKey)
          .order('score', { ascending: false })
          .order('updated_at', { ascending: true })
          .range(from, to),
        '리더보드 조회가 지연되고 있습니다.'
      );

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    entries.push(...(data || []));
    if (!data || data.length < (to - from + 1)) {
      break;
    }
  }

  return entries;
}

async function fetchLeaderboardProfileDirect(userId) {
  const [currentResult, historyResult] = await Promise.allSettled([
    withTimeout(
      supabase
        .from('leaderboard_entries')
        .select(LEADERBOARD_SELECT_WITH_TRACKS)
        .eq('user_id', userId)
        .single(),
      '프로필 정보를 불러오는 중입니다.'
    ),
    withTimeout(
      supabase
        .from('leaderboard_entry_history')
        .select(LEADERBOARD_SELECT_WITH_TRACKS)
        .eq('user_id', userId)
        .order('season_start_date', { ascending: false })
        .limit(8),
      '시즌 기록을 불러오는 중입니다.'
    ),
  ]);

  const hasTrackColumnError =
    (currentResult.status === 'fulfilled' && isTrackScoreColumnMissing(currentResult.value?.error)) ||
    (historyResult.status === 'fulfilled' && isTrackScoreColumnMissing(historyResult.value?.error));

  if (hasTrackColumnError) {
    const [currentFallback, historyFallback] = await Promise.allSettled([
      withTimeout(
        supabase
          .from('leaderboard_entries')
          .select(LEADERBOARD_SELECT_BASE)
          .eq('user_id', userId)
          .single(),
        '프로필 정보를 불러오는 중입니다.'
      ),
      withTimeout(
        supabase
          .from('leaderboard_entry_history')
          .select(LEADERBOARD_SELECT_BASE)
          .eq('user_id', userId)
          .order('season_start_date', { ascending: false })
          .limit(8),
        '시즌 기록을 불러오는 중입니다.'
      ),
    ]);

    const current = currentFallback.status === 'fulfilled' ? (currentFallback.value?.data || null) : null;
    const history = historyFallback.status === 'fulfilled'
      ? (historyFallback.value?.data || [])
      : (current ? [current] : []);

    return {
      profile: current,
      seasons: history,
    };
  }

  if (currentResult.status === 'rejected') {
    const reason = currentResult.reason;
    if (isTrackScoreColumnMissing(reason)) {
      const [currentFallback, historyFallback] = await Promise.allSettled([
        withTimeout(
          supabase
            .from('leaderboard_entries')
            .select(LEADERBOARD_SELECT_BASE)
            .eq('user_id', userId)
            .single(),
          '프로필 정보를 불러오는 중입니다.'
        ),
        withTimeout(
          supabase
            .from('leaderboard_entry_history')
            .select(LEADERBOARD_SELECT_BASE)
            .eq('user_id', userId)
            .order('season_start_date', { ascending: false })
            .limit(8),
          '시즌 기록을 불러오는 중입니다.'
        ),
      ]);

      const current = currentFallback.status === 'fulfilled' ? (currentFallback.value?.data || null) : null;
      const history = historyFallback.status === 'fulfilled'
        ? (historyFallback.value?.data || [])
        : (current ? [current] : []);

      return {
        profile: current,
        seasons: history,
      };
    }

    throw currentResult.reason;
  }

  const current = currentResult.value?.data || null;
  const history = historyResult.status === 'fulfilled'
    ? (historyResult.value?.data || [])
    : (current ? [current] : []);

  return {
    profile: current,
    seasons: history,
  };
}

export async function syncLeaderboardEntry(entry) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다.');
  }

  if (USE_DIRECT_SUPABASE) {
    return syncLeaderboardEntryDirect(entry, data.session);
  }

  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/leaderboard/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: data.session.access_token,
        entry,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || '리더보드 동기화에 실패했습니다.');
    }

    return result.entry;
  } catch (requestError) {
    return syncLeaderboardEntryDirect(entry, data.session);
  }
}

export async function fetchLeaderboard(limit = 20, seasonKey = getCurrentSeasonMeta().seasonKey) {
  if (USE_DIRECT_SUPABASE) {
    return fetchLeaderboardDirect(limit, seasonKey);
  }

  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/leaderboard?limit=${limit}&seasonKey=${encodeURIComponent(seasonKey)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || '리더보드를 불러오지 못했습니다.');
    }

    return result.entries || [];
  } catch (requestError) {
    return fetchLeaderboardDirect(limit, seasonKey);
  }
}

export async function fetchLeaderboardProfile(userId) {
  if (!userId) {
    throw new Error('사용자 정보가 없습니다.');
  }

  if (USE_DIRECT_SUPABASE) {
    return fetchLeaderboardProfileDirect(userId);
  }

  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/leaderboard/profile?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || '프로필을 불러오지 못했습니다.');
    }

    return {
      profile: result.profile || null,
      seasons: result.seasons || [],
    };
  } catch (requestError) {
    return fetchLeaderboardProfileDirect(userId);
  }
}
