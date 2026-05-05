import { readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, 'server/.env');
const defaultOutputFilePath = path.join(projectRoot, 'tmp/all-user-leaderboard-randomized-season-points.json');
const pageSize = 1000;

const parseDotenv = async (filePath) => {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')];
        })
    );
  } catch {
    return {};
  }
};

const loadEnv = async () => {
  const env = await parseDotenv(envFilePath);
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
};

const parseArgs = () => {
  const options = {
    dryRun: false,
    output: defaultOutputFilePath,
    seed: 20260505,
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--dry-run') options.dryRun = true;
    if (key === '--output') options.output = path.resolve(projectRoot, value);
    if (key === '--seed') options.seed = Number(value) || options.seed;
  }

  return options;
};

const stableHash = (value, seed) => {
  let hash = seed >>> 0;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
};

const createSeasonPoints = (entry, seed) => stableHash(entry.user_id || entry.user_email, seed) % 3001;

const clampCount = (value, fallback = 0) => Math.max(0, Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);

const buildScore = ({ xp, streakCount = 0, completedCount = 0, resolvedReviewCount = 0 }) => (
  xp + (clampCount(streakCount) * 120) + (clampCount(completedCount) * 35) + (clampCount(resolvedReviewCount) * 20)
);

const decomposeSeasonPoints = (score) => {
  const targetScore = clampCount(score);
  const maxStreak = Math.min(7, Math.floor(targetScore / 120));

  for (let streakCount = maxStreak; streakCount >= 0; streakCount -= 1) {
    const afterStreak = targetScore - (streakCount * 120);
    const maxCompleted = Math.min(30, Math.floor(afterStreak / 35));

    for (let completedCount = maxCompleted; completedCount >= 0; completedCount -= 1) {
      const afterCompleted = afterStreak - (completedCount * 35);
      const maxResolved = Math.min(60, Math.floor(afterCompleted / 20));

      for (let resolvedReviewCount = maxResolved; resolvedReviewCount >= 0; resolvedReviewCount -= 1) {
        const xp = afterCompleted - (resolvedReviewCount * 20);
        if (xp >= 0 && xp <= 1000) {
          return {
            xp,
            streakCount,
            bestStreak: streakCount,
            completedCount,
            resolvedReviewCount,
            score: targetScore,
          };
        }
      }
    }
  }

  return {
    xp: Math.min(targetScore, 1000),
    streakCount: 0,
    bestStreak: 0,
    completedCount: 0,
    resolvedReviewCount: 0,
    score: Math.min(targetScore, 1000),
  };
};

const allocateTrackScores = (entry, score) => {
  const currentYouth = clampCount(entry.score_youth);
  const currentStart = clampCount(entry.score_start);
  const currentOne = clampCount(entry.score_one);
  const currentTotal = currentYouth + currentStart + currentOne;

  if (currentTotal <= 0) {
    return { score_youth: score, score_start: 0, score_one: 0 };
  }

  const scoreYouth = Math.floor((score * currentYouth) / currentTotal);
  const scoreStart = Math.floor((score * currentStart) / currentTotal);
  const scoreOne = score - scoreYouth - scoreStart;

  return {
    score_youth: scoreYouth,
    score_start: scoreStart,
    score_one: scoreOne,
  };
};

const isTrackScoreColumnMissing = (error) => {
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
};

const isMissingTable = (error, tableName) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes(`'public.${tableName}'`) || message.includes(`relation "${tableName}" does not exist`);
};

const hasTable = async (supabaseAdmin, tableName) => {
  const { error } = await supabaseAdmin
    .from(tableName)
    .select('user_id')
    .limit(1);

  return !isMissingTable(error, tableName);
};

const stringifyError = (error) => {
  if (!error) return 'Unknown error';
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const fetchAllLeaderboardEntries = async (supabaseAdmin) => {
  const baseSelect = [
    'user_id',
    'user_email',
    'display_name',
    'season_key',
    'xp',
    'streak_count',
    'best_streak',
    'completed_count',
    'active_review_count',
    'resolved_review_count',
    'score',
  ].join(',');
  const selectWithTrackScores = [
    baseSelect,
    'score_youth',
    'score_start',
    'score_one',
  ].join(',');
  const entries = [];

  for (let from = 0; ; from += pageSize) {
    let { data, error } = await supabaseAdmin
      .from('leaderboard_entries')
      .select(selectWithTrackScores)
      .order('user_email', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error && isTrackScoreColumnMissing(error)) {
      const fallback = await supabaseAdmin
        .from('leaderboard_entries')
        .select(baseSelect)
        .order('user_email', { ascending: true })
        .range(from, from + pageSize - 1);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    entries.push(...(data || []));
    if (!data || data.length < pageSize) {
      break;
    }
  }

  return entries;
};

const updateCurrentEntry = async (supabaseAdmin, entry, payload) => {
  let result = await supabaseAdmin
    .from('leaderboard_entries')
    .update(payload)
    .eq('user_id', entry.user_id);

  if (result.error && isTrackScoreColumnMissing(result.error)) {
    const { score_youth, score_start, score_one, ...legacyPayload } = payload;
    result = await supabaseAdmin
      .from('leaderboard_entries')
      .update(legacyPayload)
      .eq('user_id', entry.user_id);
  }

  if (result.error) {
    throw result.error;
  }
};

const updateHistoryEntry = async (supabaseAdmin, entry, payload) => {
  if (!entry.season_key) {
    return;
  }

  let result = await supabaseAdmin
    .from('leaderboard_entry_history')
    .update(payload)
    .eq('user_id', entry.user_id)
    .eq('season_key', entry.season_key);

  if (result.error && isMissingTable(result.error, 'leaderboard_entry_history')) {
    return;
  }

  if (result.error && isTrackScoreColumnMissing(result.error)) {
    const { score_youth, score_start, score_one, ...legacyPayload } = payload;
    result = await supabaseAdmin
      .from('leaderboard_entry_history')
      .update(legacyPayload)
      .eq('user_id', entry.user_id)
      .eq('season_key', entry.season_key);
  }

  if (result.error && !isMissingTable(result.error, 'leaderboard_entry_history')) {
    throw result.error;
  }
};

const buildPlan = (entries, seed) => entries.map((entry) => {
  const components = decomposeSeasonPoints(createSeasonPoints(entry, seed));
  const activeReviewCount = clampCount(entry.active_review_count);
  const score = buildScore(components);
  const trackScores = allocateTrackScores(entry, score);

  return {
    userId: entry.user_id,
    email: entry.user_email,
    displayName: entry.display_name,
    seasonKey: entry.season_key,
    before: {
      xp: entry.xp,
      score: entry.score,
      scoreYouth: entry.score_youth,
      scoreStart: entry.score_start,
      scoreOne: entry.score_one,
    },
    after: {
      xp: components.xp,
      streakCount: components.streakCount,
      bestStreak: Math.max(components.bestStreak, components.streakCount),
      completedCount: components.completedCount,
      activeReviewCount,
      resolvedReviewCount: components.resolvedReviewCount,
      score,
      ...trackScores,
    },
  };
});

const main = async () => {
  const options = parseArgs();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await loadEnv();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment or server/.env');
    process.exit(1);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entries = await fetchAllLeaderboardEntries(supabaseAdmin);
  const plan = buildPlan(entries, options.seed);
  const canUpdateHistory = await hasTable(supabaseAdmin, 'leaderboard_entry_history');

  if (options.dryRun) {
    console.log(JSON.stringify({
      total: plan.length,
      canUpdateHistory,
      samples: plan.slice(0, 20),
    }, null, 2));
    return;
  }

  const updated = [];
  const failed = [];

  for (const item of plan) {
    const payload = {
      xp: item.after.xp,
      streak_count: item.after.streakCount,
      best_streak: item.after.bestStreak,
      completed_count: item.after.completedCount,
      active_review_count: item.after.activeReviewCount,
      resolved_review_count: item.after.resolvedReviewCount,
      score: item.after.score,
      score_youth: item.after.score_youth,
      score_start: item.after.score_start,
      score_one: item.after.score_one,
      updated_at: new Date().toISOString(),
    };

    try {
      await updateCurrentEntry(supabaseAdmin, { user_id: item.userId }, payload);
      if (canUpdateHistory) {
        await updateHistoryEntry(supabaseAdmin, { user_id: item.userId, season_key: item.seasonKey }, payload);
      }
      updated.push(item);
      console.log(`updated ${updated.length}/${plan.length}: ${item.email} score ${item.before.score} -> ${item.after.score}, xp ${item.after.xp}`);
    } catch (error) {
      failed.push({
        email: item.email,
        userId: item.userId,
        message: error.message || String(error),
      });
      console.error(`failed ${item.email}: ${error.message || error}`);
    }
  }

  await writeFile(options.output, JSON.stringify({ updated, failed }, null, 2));

  console.log(`\nUpdated: ${updated.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Output: ${options.output}`);

  if (failed.length) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(stringifyError(error));
  process.exit(1);
});
