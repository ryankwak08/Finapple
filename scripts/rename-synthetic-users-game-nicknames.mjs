import { mkdir, readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, 'server/.env');
const defaultSourceFilePath = path.join(projectRoot, 'tmp/synthetic-test-users-2000.json');
const defaultOutputFilePath = path.join(projectRoot, 'tmp/synthetic-users-game-nicknames.json');

const consonants = 'bcdfghjklmnpqrstvwxyz'.split('');
const vowels = 'aeiou'.split('');

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
    limit: 0,
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--dry-run') options.dryRun = true;
    if (key === '--source') options.source = path.resolve(projectRoot, value);
    if (key === '--output') options.output = path.resolve(projectRoot, value);
    if (key === '--limit') options.limit = Number(value);
  }

  if (options.limit && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }

  return options;
};

const createSeed = (user, index) => {
  const input = `${user.email || ''}:${user.userId || ''}:${index + 1}`;
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const nextState = (state) => (Math.imul(state, 1664525) + 1013904223) >>> 0;

const buildLetters = (seed) => {
  let state = seed || 20260518;
  let letters = '';

  for (let index = 0; index < 6; index += 1) {
    state = nextState(state);
    const pool = index % 2 === 0 ? consonants : vowels;
    letters += pool[state % pool.length];
  }

  return letters;
};

const buildGameNickname = (user, index, used) => {
  const seed = createSeed(user, index);
  const letters = buildLetters(seed);
  const baseNumber = (((seed ^ (index * 7919)) >>> 0) % 900) + 100;

  for (let offset = 0; offset < 1000; offset += 1) {
    const number = String(((baseNumber + offset - 100) % 900) + 100).padStart(3, '0');
    const nickname = `${letters}${number}`;

    if (!used.has(nickname)) {
      used.add(nickname);
      return nickname;
    }
  }

  throw new Error(`Could not generate a unique nickname for ${user.email || user.userId}.`);
};

const buildRenamePlan = (users) => {
  const used = new Set();

  return users.map((user, index) => ({
    ...user,
    nextNickname: buildGameNickname(user, index, used),
  }));
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

const updateLeaderboardDisplayName = async (supabaseAdmin, user, nickname) => {
  const { error } = await supabaseAdmin
    .from('leaderboard_entries')
    .update({
      display_name: nickname,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.userId);

  if (error) {
    throw error;
  }
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

const applyRename = async (supabaseAdmin, user, nickname) => {
  await updateProfileNickname(supabaseAdmin, user, nickname);
  await updateLeaderboardDisplayName(supabaseAdmin, user, nickname);
  await updateAuthNickname(supabaseAdmin, user, nickname);
};

const main = async () => {
  const options = parseArgs();
  const source = JSON.parse(await readFile(options.source, 'utf-8'));
  let users = (source.created || [])
    .filter((user) => user.email?.endsWith('@synthetic.test.finapple.app'))
    .sort((a, b) => a.email.localeCompare(b.email));

  if (options.limit) {
    users = users.slice(0, options.limit);
  }

  const plan = buildRenamePlan(users);

  if (options.dryRun) {
    const invalid = plan.filter((user) => !/^[0-9A-Za-z가-힣_]{2,12}$/.test(user.nextNickname));
    const uniqueCount = new Set(plan.map((user) => user.nextNickname)).size;

    console.log(JSON.stringify(plan.slice(0, 30).map(({ email, nickname, nextNickname }) => ({
      email,
      from: nickname,
      to: nextNickname,
    })), null, 2));
    console.log(`Total: ${plan.length}`);
    console.log(`Unique nicknames: ${uniqueCount}`);
    console.log(`Invalid nicknames: ${invalid.length}`);
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

  const renamed = [];
  const failed = [];

  for (const user of plan) {
    try {
      await applyRename(supabaseAdmin, user, user.nextNickname);

      renamed.push({
        email: user.email,
        userId: user.userId,
        previousNickname: user.nickname,
        nickname: user.nextNickname,
      });
      console.log(`renamed ${renamed.length}/${plan.length}: ${user.email} -> ${user.nextNickname}`);
    } catch (error) {
      failed.push({
        email: user.email,
        userId: user.userId,
        attemptedNickname: user.nextNickname,
        message: error.message || String(error),
      });
      console.error(`failed ${user.email}: ${error.message || error}`);
    }
  }

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, JSON.stringify({ renamed, failed }, null, 2));

  console.log(`\nRenamed: ${renamed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Output: ${options.output}`);

  if (failed.length) {
    process.exitCode = 1;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
