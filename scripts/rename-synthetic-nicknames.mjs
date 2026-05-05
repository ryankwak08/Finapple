import { readFile, writeFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, 'server/.env');
const defaultSourceFilePath = path.join(projectRoot, 'tmp/synthetic-test-users.json');
const defaultOutputFilePath = path.join(projectRoot, 'tmp/synthetic-test-user-renames.json');

const imageNames = [
  'Olivia', 'Amelia', 'Lily', 'Isla', 'Ivy', 'Florence', 'Freya', 'Poppy', 'Ava', 'Elsie',
  'Isabella', 'Sofia', 'Sophia', 'Mia', 'Maya', 'Bonnie', 'Phoebe', 'Daisy', 'Sienna', 'Evelyn',
  'Willow', 'Harper', 'Charlotte', 'Rosie', 'Grace', 'Maeve', 'Millie', 'Margot', 'Evie',
  'Arabella', 'Matilda', 'Hallie', 'Delilah', 'Emily', 'Aria', 'Penelope', 'Mabel', 'Lottie',
  'Ella', 'Ada', 'Ruby', 'Violet', 'Aurora', 'Maisie', 'Emilia', 'Mila', 'Ayla', 'Luna',
  'Alice', 'Sophie', 'Esme', 'Isabelle', 'Olive', 'Eva', 'Elodie', 'Layla', 'Maryam', 'Orla',
  'Rose', 'Eden', 'Iris', 'Elizabeth', 'Eliza', 'Imogen', 'Erin', 'Thea', 'Eleanor', 'Harriet',
  'Emma', 'Zara', 'Ottilie', 'Chloe', 'Ophelia', 'Lyla', 'Hazel', 'Bella', 'Fatima', 'Robyn',
  'Scarlett', 'Nova', 'Nancy', 'Raya', 'Lyra', 'Clara', 'Eloise', 'Nora', 'Lola', 'Ellie',
  'Myla', 'Darcie', 'Maria', 'Jasmine', 'Nellie', 'Rosa', 'Jessica', 'Athena', 'Sara', 'Lara',
  'Zoe', 'Amelie', 'Muhammad', 'Noah', 'Oliver', 'Arthur', 'Leo', 'George', 'Luca', 'Theodore',
  'Oscar', 'Archie', 'Jude', 'Theo', 'Freddie', 'Henry', 'Arlo', 'Alfie', 'Charlie', 'Finley',
  'Albie', 'Harry', 'Mohammed', 'Jack', 'Elijah', 'Rory', 'Lucas', 'Thomas', 'William', 'Louie',
  'Teddy', 'Jacob', 'Edward', 'Roman', 'Reuben', 'Oakley', 'Adam', 'Alexander', 'Isaac', 'Ezra',
  'Tommy', 'James', 'Rowan', 'Hudson', 'Reggie', 'Max', 'Sebastian', 'Hugo', 'Louis', 'Ethan',
  'Ronnie', 'Joshua', 'Sonny', 'Harrison', 'Mohamad', 'Jesse', 'Frederick', 'Joseph', 'Albert',
  'Frankie', 'Daniel', 'Samuel', 'Benjamin', 'Felix', 'Mason', 'David', 'Dylan', 'Jaxon', 'Otis',
  'Yusuf', 'Zachary', 'Liam', 'Jasper', 'Kai', 'Musa', 'Gabriel', 'Caleb', 'Logan', 'Ibrahim',
  'Hunter', 'Elias', 'Riley', 'Alfred', 'Bobby', 'Finn', 'Rupert', 'Michael', 'Toby', 'Myles',
  'Austin', 'Nathan', 'Grayson', 'Vinnie', 'Enzo', 'Yahya', 'Ralph', 'Ellis', 'Milo', 'Bodhi',
  'Elliott', 'Brody', 'Leon',
];

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
  };

  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    if (key === '--dry-run') options.dryRun = true;
    if (key === '--source') options.source = path.resolve(projectRoot, value);
    if (key === '--output') options.output = path.resolve(projectRoot, value);
  }

  return options;
};

const dedupe = (values) => [...new Set(values)];

const seededShuffle = (values, seed = 20260505) => {
  const shuffled = [...values];
  let state = seed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const buildRenamePlan = (users) => {
  const names = seededShuffle(dedupe(imageNames));
  if (users.length > names.length) {
    throw new Error(`Not enough unique names. Need ${users.length}, have ${names.length}.`);
  }

  return users.map((user, index) => ({
    ...user,
    nextNickname: names[index],
    fallbackNickname: `${names[index]}${String(index + 1).padStart(3, '0')}`,
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
  const users = (source.created || [])
    .filter((user) => user.email?.startsWith('synthetic+'))
    .sort((a, b) => a.email.localeCompare(b.email));

  const plan = buildRenamePlan(users);

  if (options.dryRun) {
    console.log(JSON.stringify(plan.map(({ email, nickname, nextNickname }) => ({
      email,
      from: nickname,
      to: nextNickname,
    })), null, 2));
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
    let finalNickname = user.nextNickname;
    try {
      try {
        await applyRename(supabaseAdmin, user, finalNickname);
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('duplicate') && error?.code !== '23505') {
          throw error;
        }

        finalNickname = user.fallbackNickname;
        await applyRename(supabaseAdmin, user, finalNickname);
      }

      renamed.push({
        email: user.email,
        userId: user.userId,
        previousNickname: user.nickname,
        nickname: finalNickname,
      });
      console.log(`renamed ${renamed.length}/${plan.length}: ${user.email} -> ${finalNickname}`);
    } catch (error) {
      failed.push({
        email: user.email,
        message: error.message || String(error),
      });
      console.error(`failed ${user.email}: ${error.message || error}`);
    }
  }

  await writeFile(options.output, JSON.stringify({ renamed, failed }, null, 2));

  console.log(`\nRenamed: ${renamed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Output: ${options.output}`);

  if (failed.length) {
    process.exitCode = 1;
  }
};

main();
