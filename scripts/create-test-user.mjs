import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFilePath = path.resolve(__dirname, '../server/.env');

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
          return [line.slice(0, index), line.slice(index + 1)];
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

const toSeoNickname = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const getTodaySeoulDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const usage = () => {
  console.log('Usage: node scripts/create-test-user.mjs <email> <password> <nickname> [premium]');
  console.log('Example: node scripts/create-test-user.mjs test+1@finapple.app Test1234! tester false');
};

const main = async () => {
  const [email, password, nickname, premiumFlag = 'false'] = process.argv.slice(2);
  if (!email || !password || !nickname) {
    usage();
    process.exit(1);
  }

  const isPremium = premiumFlag.toLowerCase() === 'true';
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await loadEnv();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment or server/.env');
    process.exit(1);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const normalizedNickname = toSeoNickname(nickname);
  if (!normalizedNickname) {
    console.error('Invalid nickname. Please use alphanumeric or underscore characters.');
    process.exit(1);
  }

  try {
    const { data: authResponse, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nickname: normalizedNickname,
        is_premium: isPremium,
        premium_provider: isPremium ? 'manual' : '',
        agreements: {
          termsAgreedAt: new Date().toISOString(),
          privacyAgreedAt: new Date().toISOString(),
          ageConfirmedAt: new Date().toISOString(),
          marketingOptIn: false,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    const userId = authResponse?.user?.id;
    if (!userId) {
      throw new Error('Supabase user ID was not returned.');
    }

    const profilePayload = {
      user_id: userId,
      email,
      nickname: normalizedNickname,
      updated_at: new Date().toISOString(),
    };

    const profileResult = await supabaseAdmin
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileResult.error) {
      throw profileResult.error;
    }

    const statePayload = {
      user_id: userId,
      user_email: email,
      hearts: 5,
      hearts_last_reset: getTodaySeoulDate(),
      updated_at: new Date().toISOString(),
    };

    const stateResult = await supabaseAdmin
      .from('user_progress_state')
      .upsert(statePayload, { onConflict: 'user_id' });

    if (stateResult.error) {
      throw stateResult.error;
    }

    console.log('Test user created successfully:');
    console.log(`  email: ${email}`);
    console.log(`  password: ${password}`);
    console.log(`  nickname: ${normalizedNickname}`);
    console.log(`  premium: ${isPremium}`);
    console.log(`  userId: ${userId}`);
  } catch (error) {
    console.error('Failed to create test user:', error.message || error);
    process.exit(1);
  }
};

main();
