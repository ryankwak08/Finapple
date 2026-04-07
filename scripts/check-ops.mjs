import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const applyEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
};

applyEnvFile(path.join(projectRoot, '.env'));
applyEnvFile(path.join(projectRoot, 'server', '.env'));

const publicEnvChecklist = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_BASE_URL',
];

const serverEnvChecklist = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FRONTEND_URL',
];

const optionalEnvChecklist = [
  'VITE_BACKEND_URL',
  'TOSS_SECRET_KEY',
  'OPENAI_API_KEY',
  'KAKAO_ADMIN_KEY',
];

const getMissing = (keys) => keys.filter((key) => !process.env[key]);
const printSection = (title, keys) => {
  console.log(`\n[${title}]`);
  for (const key of keys) {
    console.log(`- ${key}: ${process.env[key] ? 'configured' : 'missing'}`);
  }
};

const publicMissing = getMissing(publicEnvChecklist);
const serverMissing = getMissing(serverEnvChecklist);

printSection('Public env', [...publicEnvChecklist, ...optionalEnvChecklist.filter((key) => key.startsWith('VITE_'))]);
printSection('Server env', [...serverEnvChecklist, ...optionalEnvChecklist.filter((key) => !key.startsWith('VITE_'))]);

const target = process.env.CHECK_OPS_URL || 'http://127.0.0.1:3000/api/health';

try {
  const response = await fetch(target);
  const payload = await response.json();
  console.log(`\n[Healthcheck] ${target}`);
  console.log(`- HTTP: ${response.status}`);
  console.log(`- status: ${payload.status || (payload.ok ? 'ok' : 'unknown')}`);
  if (payload?.config?.requiredMissing?.length) {
    console.log(`- requiredMissing: ${payload.config.requiredMissing.join(', ')}`);
  }
  if (payload?.config?.recommendedMissing?.length) {
    console.log(`- recommendedMissing: ${payload.config.recommendedMissing.join(', ')}`);
  }
} catch (error) {
  console.log(`\n[Healthcheck] ${target}`);
  console.log(`- unavailable: ${error.message}`);
}

if (publicMissing.length || serverMissing.length) {
  process.exitCode = 1;
}
