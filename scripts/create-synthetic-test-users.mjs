import { mkdir, readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCurrentSeasonMeta } from '../src/lib/season.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFilePath = path.resolve(__dirname, '../server/.env');
const outputFilePath = path.resolve(__dirname, '../tmp/synthetic-test-users.json');

const DEFAULT_COUNT = 100;
const DEFAULT_PASSWORD = 'SyntheticTest1234!';
const DEFAULT_DOMAIN = 'synthetic.test.finapple.app';
const DEFAULT_PREFIX = 'synthetic';

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
    count: DEFAULT_COUNT,
    password: DEFAULT_PASSWORD,
    domain: DEFAULT_DOMAIN,
    prefix: DEFAULT_PREFIX,
    dryRun: false,
    withLeaderboard: true,
    premiumEvery: 0,
    runId: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replaceAll('-', ''),
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--dry-run') options.dryRun = true;
    if (key === '--no-leaderboard') options.withLeaderboard = false;
    if (key === '--count') options.count = Number(value);
    if (key === '--password') options.password = value;
    if (key === '--domain') options.domain = value;
    if (key === '--prefix') options.prefix = value;
    if (key === '--premium-every') options.premiumEvery = Number(value);
    if (key === '--run-id') options.runId = value;
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 500) {
    throw new Error('--count must be an integer from 1 to 500.');
  }

  if (options.premiumEvery && (!Number.isInteger(options.premiumEvery) || options.premiumEvery < 1)) {
    throw new Error('--premium-every must be a positive integer.');
  }

  return options;
};

const pad = (value) => String(value).padStart(3, '0');

const buildSyntheticUsers = ({ count, domain, prefix, password, premiumEvery, runId }) => {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const padded = pad(number);
    const email = `${prefix}+${runId}-${padded}@${domain}`;
    const nickname = `${prefix}_${runId}_${padded}`;
    const isPremium = premiumEvery > 0 && number % premiumEvery === 0;

    return {
      email,
      password,
      nickname,
      isPremium,
      syntheticIndex: number,
    };
  });
};

const getTodaySeoulDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const buildLeaderboardPayload = ({ userId, email, nickname, index, isPremium }) => {
  const season = getCurrentSeasonMeta();
  const xp = 180 + ((index * 73) % 3600);
  const streakCount = 1 + (index % 21);
  const bestStreak = streakCount + (index % 9);
  const completedCount = 2 + (index % 38);
  const resolvedReviewCount = index % 18;
  const score = xp + (streakCount * 120) + (completedCount * 35) + (resolvedReviewCount * 20);

  return {
    user_id: userId,
    user_email: email,
    display_name: nickname,
    avatar_url: '',
    season_key: season.seasonKey,
    season_label: season.label,
    season_start_date: season.startDate,
    season_end_date: season.endDate,
    xp,
    streak_count: streakCount,
    best_streak: bestStreak,
    streak_freezers: index % 4,
    completed_count: completedCount,
    active_review_count: index % 7,
    resolved_review_count: resolvedReviewCount,
    ads_disabled: isPremium,
    score,
    score_youth: score,
    score_start: Math.floor(score * (0.7 + ((index % 4) * 0.06))),
    score_one: Math.floor(score * (0.45 + ((index % 6) * 0.05))),
    updated_at: new Date(Date.now() - (index * 60000)).toISOString(),
  };
};

const createAuthUser = async (supabaseAdmin, syntheticUser) => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: syntheticUser.email,
    password: syntheticUser.password,
    email_confirm: true,
    user_metadata: {
      nickname: syntheticUser.nickname,
      is_premium: syntheticUser.isPremium,
      premium_provider: syntheticUser.isPremium ? 'synthetic-test' : '',
      synthetic_test_user: true,
      agreements: {
        termsAgreedAt: new Date().toISOString(),
        privacyAgreedAt: new Date().toISOString(),
        ageConfirmedAt: new Date().toISOString(),
        marketingOptIn: false,
      },
    },
    app_metadata: {
      synthetic_test_user: true,
    },
  });

  if (error) {
    throw error;
  }

  return data?.user;
};

const isAlreadyRegisteredError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already been registered') || message.includes('already registered');
};

const getExistingUserFromProfile = async (supabaseAdmin, syntheticUser) => {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, email, nickname')
    .eq('email', syntheticUser.email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.user_id) {
    throw new Error(`User already exists in auth, but no profile row was found for ${syntheticUser.email}.`);
  }

  return {
    id: data.user_id,
    email: data.email,
    user_metadata: {
      nickname: data.nickname,
      synthetic_test_user: true,
    },
  };
};

const createOrFindAuthUser = async (supabaseAdmin, syntheticUser) => {
  try {
    return await createAuthUser(supabaseAdmin, syntheticUser);
  } catch (error) {
    if (!isAlreadyRegisteredError(error)) {
      throw error;
    }

    return getExistingUserFromProfile(supabaseAdmin, syntheticUser);
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

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    message.includes('could not find the table') ||
    details.includes('could not find the table')
  );
};

const withoutTrackScores = (payload) => {
  const { score_youth, score_start, score_one, ...legacyPayload } = payload;
  return legacyPayload;
};

const upsertLeaderboardPayload = async (
  supabaseAdmin,
  tableName,
  payload,
  onConflict,
  { optional = false } = {}
) => {
  let result = await supabaseAdmin
    .from(tableName)
    .upsert(payload, { onConflict });

  if (result.error && optional && isMissingTableError(result.error)) {
    return false;
  }

  if (result.error && isTrackScoreColumnMissing(result.error)) {
    result = await supabaseAdmin
      .from(tableName)
      .upsert(withoutTrackScores(payload), { onConflict });
  }

  if (result.error && optional && isMissingTableError(result.error)) {
    return false;
  }

  if (result.error) {
    throw result.error;
  }

  return true;
};

const usage = () => {
  console.log('Usage: npm run create:synthetic-users -- [options]');
  console.log('Options:');
  console.log('  --count=100              Number of synthetic test users to create.');
  console.log('  --run-id=20260505        Stable batch id used in email/nickname.');
  console.log('  --prefix=synthetic       Email/nickname prefix.');
  console.log('  --domain=synthetic.test.finapple.app');
  console.log('  --password=SyntheticTest1234!');
  console.log('  --premium-every=10       Mark every nth account as premium.');
  console.log('  --no-leaderboard         Create accounts without leaderboard entries.');
  console.log('  --dry-run                Print the generated users without writing to Supabase.');
};

const main = async () => {
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    usage();
    console.error(`\n${error.message}`);
    process.exit(1);
  }

  const syntheticUsers = buildSyntheticUsers(options);

  if (options.dryRun) {
    console.log(JSON.stringify(syntheticUsers, null, 2));
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

  const created = [];
  const failed = [];

  for (const syntheticUser of syntheticUsers) {
    try {
      const authUser = await createOrFindAuthUser(supabaseAdmin, syntheticUser);
      if (!authUser?.id) {
        throw new Error('Supabase user ID was not returned.');
      }

      const now = new Date().toISOString();
      const profilePayload = {
        user_id: authUser.id,
        email: syntheticUser.email,
        nickname: syntheticUser.nickname,
        avatar_url: '',
        updated_at: now,
      };

      const profileResult = await supabaseAdmin
        .from('user_profiles')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (profileResult.error) {
        throw profileResult.error;
      }

      const statePayload = {
        user_id: authUser.id,
        user_email: syntheticUser.email,
        hearts: 5,
        hearts_last_reset: getTodaySeoulDate(),
        updated_at: now,
        updated_by_user_id: authUser.id,
        updated_by_email: syntheticUser.email,
      };

      const stateResult = await supabaseAdmin
        .from('user_progress_state')
        .upsert(statePayload, { onConflict: 'user_id' });

      if (stateResult.error) {
        throw stateResult.error;
      }

      if (options.withLeaderboard) {
        const leaderboardPayload = buildLeaderboardPayload({
          userId: authUser.id,
          email: syntheticUser.email,
          nickname: syntheticUser.nickname,
          index: syntheticUser.syntheticIndex,
          isPremium: syntheticUser.isPremium,
        });

        await upsertLeaderboardPayload(
          supabaseAdmin,
          'leaderboard_entries',
          leaderboardPayload,
          'user_id'
        );

        await upsertLeaderboardPayload(
          supabaseAdmin,
          'leaderboard_entry_history',
          leaderboardPayload,
          'user_id,season_key',
          { optional: true }
        );
      }

      created.push({
        email: syntheticUser.email,
        password: syntheticUser.password,
        nickname: syntheticUser.nickname,
        userId: authUser.id,
        premium: syntheticUser.isPremium,
      });

      console.log(`created ${created.length}/${syntheticUsers.length}: ${syntheticUser.email}`);
    } catch (error) {
      failed.push({
        email: syntheticUser.email,
        message: error.message || String(error),
      });
      console.error(`failed ${syntheticUser.email}: ${error.message || error}`);
    }
  }

  await mkdir(path.dirname(outputFilePath), { recursive: true });
  await writeFile(outputFilePath, JSON.stringify({ created, failed }, null, 2));

  console.log(`\nCreated: ${created.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Output: ${outputFilePath}`);

  if (failed.length) {
    process.exitCode = 1;
  }
};

main();
