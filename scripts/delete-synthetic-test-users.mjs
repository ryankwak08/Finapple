import { mkdir, readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, 'server/.env');
const defaultSourceFilePath = path.join(projectRoot, 'tmp/synthetic-test-users-2000.json');
const defaultOutputFilePath = path.join(projectRoot, 'tmp/synthetic-test-users-deleted.json');
const syntheticDomain = 'synthetic.test.finapple.app';

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

const getRows = (source) => [
  ...(source.created || []),
  ...(source.updated || []),
  ...(source.renamed || []),
  ...(source.users || []),
];

const normalizePlan = (source, limit = 0) => {
  const byEmail = new Map();

  for (const row of getRows(source)) {
    const email = String(row.email || '').trim().toLowerCase();
    const userId = String(row.userId || row.user_id || '').trim();

    if (!email.endsWith(`@${syntheticDomain}`)) {
      continue;
    }

    byEmail.set(email, {
      email,
      userId: userId || byEmail.get(email)?.userId || '',
    });
  }

  const plan = [...byEmail.values()].sort((left, right) => left.email.localeCompare(right.email));
  return limit ? plan.slice(0, limit) : plan;
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

const deleteFromTable = async (supabaseAdmin, tableName, columnName, values, { optional = false } = {}) => {
  const deleted = [];

  for (const value of values) {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq(columnName, value);

    if (error) {
      if (optional && isMissingTableError(error)) {
        return deleted.length;
      }

      throw error;
    }

    deleted.push(value);
  }

  return deleted.length;
};

const main = async () => {
  const options = parseArgs();
  const source = JSON.parse(await readFile(options.source, 'utf-8'));
  const plan = normalizePlan(source, options.limit);

  if (plan.length === 0) {
    console.log('No synthetic users found in source file.');
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify(plan.slice(0, 30), null, 2));
    console.log(`Total synthetic users planned for deletion: ${plan.length}`);
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

  const deleted = [];
  const failed = [];

  for (const user of plan) {
    try {
      const userIds = user.userId ? [user.userId] : [];

      if (userIds.length > 0) {
        await deleteFromTable(supabaseAdmin, 'leaderboard_entry_history', 'user_id', userIds);
        await deleteFromTable(supabaseAdmin, 'leaderboard_entries', 'user_id', userIds);
        await deleteFromTable(supabaseAdmin, 'user_progress_state', 'user_id', userIds);
        await deleteFromTable(supabaseAdmin, 'billing_subscriptions', 'user_id', userIds, { optional: true });
        await deleteFromTable(supabaseAdmin, 'user_profiles', 'user_id', userIds);

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.userId);
        if (authError) {
          throw authError;
        }
      } else {
        await deleteFromTable(supabaseAdmin, 'leaderboard_entry_history', 'user_email', [user.email]);
        await deleteFromTable(supabaseAdmin, 'leaderboard_entries', 'user_email', [user.email]);
        await deleteFromTable(supabaseAdmin, 'user_progress_state', 'user_email', [user.email]);
      }

      deleted.push(user);
      console.log(`deleted ${deleted.length}/${plan.length}: ${user.email}`);
    } catch (error) {
      failed.push({
        ...user,
        message: error.message || String(error),
      });
      console.error(`failed ${user.email}: ${error.message || error}`);
    }
  }

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, JSON.stringify({ deleted, failed }, null, 2));

  console.log(`\nDeleted: ${deleted.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Output: ${options.output}`);

  if (failed.length) {
    process.exitCode = 1;
  }
};

main();
