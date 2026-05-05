import { readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, 'server/.env');
const defaultSourceFilePath = path.join(projectRoot, 'tmp/synthetic-test-users-2000.json');
const defaultOutputFilePath = path.join(projectRoot, 'tmp/synthetic-test-users-2000-updated.json');

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
    source: defaultSourceFilePath,
    output: defaultOutputFilePath,
    onlyFailedFrom: '',
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--dry-run') options.dryRun = true;
    if (key === '--source') options.source = path.resolve(projectRoot, value);
    if (key === '--output') options.output = path.resolve(projectRoot, value);
    if (key === '--only-failed-from') options.onlyFailedFrom = path.resolve(projectRoot, value);
  }

  return options;
};

const getSyntheticIndex = (user, fallbackIndex) => {
  const match = String(user.email || '').match(/-(\d+)@/);
  return match ? Number(match[1]) : fallbackIndex + 1;
};

const createSeededTensXp = (index, seed = 20260505) => {
  const value = (((index + seed) * 1103515245 + 12345) >>> 0) % 101;
  return value * 10;
};

const removeTestMarker = (nickname) => String(nickname || '').replace('_test_', '_');

const buildScore = ({ xp, streakCount = 1, completedCount = 0, resolvedReviewCount = 0 }) => (
  xp + (Number(streakCount || 1) * 120) + (Number(completedCount || 0) * 35) + (Number(resolvedReviewCount || 0) * 20)
);

const getLeaderboardEntry = async (supabaseAdmin, user) => {
  const { data, error } = await supabaseAdmin
    .from('leaderboard_entries')
    .select('streak_count, completed_count, resolved_review_count')
    .eq('user_id', user.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || {};
};

const updateAuthNickname = async (supabaseAdmin, user, nickname) => {
  const { data: existingUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(user.userId);
  if (getError) {
    throw getError;
  }

  const currentMetadata = existingUser?.user?.user_metadata || {};
  const currentAppMetadata = existingUser?.user?.app_metadata || {};
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.userId, {
    user_metadata: {
      ...currentMetadata,
      nickname,
      synthetic_test_user: true,
    },
    app_metadata: {
      ...currentAppMetadata,
      synthetic_test_user: true,
    },
  });

  if (error) {
    throw error;
  }
};

const updateProfileNickname = async (supabaseAdmin, user, nickname) => {
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      nickname,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.userId);

  if (error) {
    throw error;
  }
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

const updateLeaderboard = async (supabaseAdmin, user, nickname, xp) => {
  const entry = await getLeaderboardEntry(supabaseAdmin, user);
  const score = buildScore({
    xp,
    streakCount: entry.streak_count,
    completedCount: entry.completed_count,
    resolvedReviewCount: entry.resolved_review_count,
  });
  const payload = {
    display_name: nickname,
    xp,
    score,
    score_youth: score,
    score_start: Math.floor(score * 0.82),
    score_one: Math.floor(score * 0.62),
    updated_at: new Date().toISOString(),
  };

  let result = await supabaseAdmin
    .from('leaderboard_entries')
    .update(payload)
    .eq('user_id', user.userId);

  if (result.error && isTrackScoreColumnMissing(result.error)) {
    const { score_youth, score_start, score_one, ...legacyPayload } = payload;
    result = await supabaseAdmin
      .from('leaderboard_entries')
      .update(legacyPayload)
      .eq('user_id', user.userId);
  }

  if (result.error) {
    throw result.error;
  }

  return score;
};

const main = async () => {
  const options = parseArgs();
  const source = JSON.parse(await readFile(options.source, 'utf-8'));
  const failedEmails = options.onlyFailedFrom
    ? new Set((JSON.parse(await readFile(options.onlyFailedFrom, 'utf-8')).failed || []).map((user) => user.email))
    : null;
  const users = (source.created || [])
    .filter((user) => user.email?.startsWith('synthetic+'))
    .filter((user) => !failedEmails || failedEmails.has(user.email))
    .sort((a, b) => a.email.localeCompare(b.email));

  const plan = users.map((user, index) => {
    const syntheticIndex = getSyntheticIndex(user, index);
    return {
      ...user,
      nickname: removeTestMarker(user.nickname),
      xp: createSeededTensXp(syntheticIndex),
    };
  });

  if (options.dryRun) {
    console.log(JSON.stringify(plan.slice(0, 20).map((user) => ({
      email: user.email,
      nickname: user.nickname,
      xp: user.xp,
      premium: user.premium,
    })), null, 2));
    console.log(`Total: ${plan.length}`);
    return;
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await loadEnv();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment or server/.env');
    process.exit(1);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const updated = [];
  const failed = [];

  for (const user of plan) {
    try {
      await updateProfileNickname(supabaseAdmin, user, user.nickname);
      const score = await updateLeaderboard(supabaseAdmin, user, user.nickname, user.xp);
      await updateAuthNickname(supabaseAdmin, user, user.nickname);

      updated.push({
        email: user.email,
        userId: user.userId,
        nickname: user.nickname,
        premium: user.premium,
        xp: user.xp,
        score,
      });

      console.log(`updated ${updated.length}/${plan.length}: ${user.email} -> ${user.nickname}, xp ${user.xp}`);
    } catch (error) {
      failed.push({
        email: user.email,
        message: error.message || String(error),
      });
      console.error(`failed ${user.email}: ${error.message || error}`);
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

main();
