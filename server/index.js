import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getQuizById, getUnitById } from '../src/lib/quizData.js';
import { getStudyTopicById } from '../src/lib/studyData.js';
import { getCurrentSeasonMeta } from '../src/lib/season.js';
import { getQuizExamplesForUnit } from './quizExampleBank.js';
import { buildFinanceChatResponse, getYouthCoreQuestions } from './financeAssistant.js';
import { generateFinanceNarrative } from './financeNarrative.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const EXTRA_FRONTEND_URLS = process.env.FRONTEND_URLS || '';
const adminEmails = String(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || 'ryankwak08@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const tossSecretKey = process.env.TOSS_SECRET_KEY;
const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PREMIUM_PRICE = 9900;
const SURVIVAL_COIN_PACK_PRICE = 2900;
const PORT = process.env.PORT || 3000;
const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const aiQuizCache = new Map();
const aiQuizInflight = new Map();
const translationCache = new Map();
const translationInflight = new Map();
const rateLimitStore = new Map();
const MAX_AI_QUIZ_ATTEMPTS = 1;
const serverEnvChecklist = [
  { key: 'SUPABASE_URL', configured: Boolean(supabaseUrl), level: 'required' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', configured: Boolean(supabaseServiceRoleKey), level: 'required' },
  { key: 'FRONTEND_URL', configured: Boolean(FRONTEND_URL), level: 'recommended' },
  { key: 'TOSS_SECRET_KEY', configured: Boolean(tossSecretKey), level: 'recommended' },
  { key: 'OPENAI_API_KEY', configured: Boolean(openAiApiKey), level: 'recommended' },
];

const quizResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'options', 'answer', 'explanation'],
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          answer: {
            type: 'integer',
            minimum: 0,
            maximum: 3,
          },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

const translatedLessonChunkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'goals', 'concepts', 'learningPoints'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    goals: {
      type: 'array',
      items: { type: 'string' },
    },
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['term', 'definition'],
        properties: {
          term: { type: 'string' },
          definition: { type: 'string' },
        },
      },
    },
    learningPoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['emoji', 'title', 'content', 'pointType'],
        properties: {
          emoji: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          pointType: { type: 'string' },
        },
      },
    },
  },
};

const normalizeLocale = (value) => {
  const locale = String(value || 'ko').toLowerCase();
  return locale.startsWith('en') ? 'en' : 'ko';
};

const getTranslationCacheKey = (type, locale, payload) => {
  const serialized = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return `${type}:${locale}:${hash}`;
};

const normalizeOrigin = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/^\/+/, '').replace(/\/$/, '')}`;
};

const parseConfiguredOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...parseConfiguredOrigins(FRONTEND_URL),
  ...parseConfiguredOrigins(EXTRA_FRONTEND_URLS),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://finapple.xyz',
  'https://www.finapple.xyz',
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const getRequestAccessToken = (req) => {
  const authorization = req.headers.authorization || '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  return String(req.body?.accessToken || '').trim();
};

const isAdminAuthUser = (user) => {
  if (!user) {
    return false;
  }

  const role = user.user_metadata?.role || user.role;
  if (role === 'admin') {
    return true;
  }

  return Boolean(user.email && adminEmails.includes(String(user.email).toLowerCase()));
};

const validateHearts = (value) => {
  const hearts = Number(value);
  if (!Number.isInteger(hearts) || hearts < 0 || hearts > 5) {
    return null;
  }

  return hearts;
};

const validateDateString = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const getTodaySeoulDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const resolveUserHeartsState = async (authUser) => {
  const today = getTodaySeoulDate();
  const userEmail = authUser?.email || '';
  const premium = Boolean(authUser?.user_metadata?.is_premium);
  const { data, error } = await supabaseAdmin
    .from('user_progress_state')
    .select('hearts, hearts_last_reset, updated_at')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    throw error;
  }

  let hearts = data?.hearts ?? 5;
  let heartsLastReset = data?.hearts_last_reset || today;
  const needsDailyReset = !premium && heartsLastReset !== today;
  const needsInitialization = !data;

  if (premium || needsDailyReset) {
    hearts = 5;
    heartsLastReset = today;
  }

  if (needsInitialization || premium || needsDailyReset) {
    const { error: upsertError } = await supabaseAdmin
      .from('user_progress_state')
      .upsert({
        user_id: authUser.id,
        user_email: userEmail,
        hearts,
        hearts_last_reset: heartsLastReset,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      throw upsertError;
    }
  }

  return {
    hearts,
    heartsLastReset,
  };
};

const buildManagedUserResponse = async (profile) => {
  if (!profile?.user_id) {
    return null;
  }

  const [{ data: authUserData, error: authUserError }, { data: stateData, error: stateError }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(profile.user_id),
    supabaseAdmin
      .from('user_progress_state')
      .select('hearts, hearts_last_reset, updated_at')
      .eq('user_id', profile.user_id)
      .maybeSingle(),
  ]);

  if (authUserError) {
    throw authUserError;
  }

  if (stateError && stateError.code !== 'PGRST116' && stateError.code !== '42P01') {
    throw stateError;
  }

  const authUser = authUserData?.user;
  const state = stateData || null;

  return {
    userId: profile.user_id,
    email: profile.email,
    nickname: profile.nickname,
    avatarUrl: profile.avatar_url || '',
    hearts: state?.hearts ?? 5,
    heartsLastReset: state?.hearts_last_reset || null,
    stateUpdatedAt: state?.updated_at || null,
    isPremium: Boolean(authUser?.user_metadata?.is_premium),
    premiumUpdatedAt: authUser?.user_metadata?.premium_updated_at || null,
  };
};

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const getServerConfigSummary = () => {
  const requiredMissing = serverEnvChecklist
    .filter((item) => item.level === 'required' && !item.configured)
    .map((item) => item.key);
  const recommendedMissing = serverEnvChecklist
    .filter((item) => item.level === 'recommended' && !item.configured)
    .map((item) => item.key);

  return {
    requiredMissing,
    recommendedMissing,
    configured: serverEnvChecklist
      .filter((item) => item.configured)
      .map((item) => item.key),
  };
};

const isAllowedCallbackUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    const origin = normalizeOrigin(url.origin);
    return isAllowedOrigin(origin);
  } catch {
    return false;
  }
};

app.get('/api/health', (_req, res) => {
  const configSummary = getServerConfigSummary();
  const status = configSummary.requiredMissing.length > 0 ? 'degraded' : 'ok';

  res.json({
    ok: status === 'ok',
    status,
    timestamp: new Date().toISOString(),
    config: configSummary,
    origins: Array.from(allowedOrigins).filter(Boolean),
    services: {
      openaiConfigured: Boolean(openAiApiKey),
      supabaseConfigured: Boolean(supabaseAdmin),
      tossConfigured: Boolean(tossSecretKey),
    },
  });
});

const buildQuizContext = (quizId) => {
  const quiz = getQuizById(quizId);
  if (!quiz) {
    return null;
  }

  const unit = getUnitById(quiz.unitId);
  const topic = unit ? getStudyTopicById(unit.studyTopicId) : null;

  return {
    quiz,
    unit,
    topic,
  };
};

const quizVariationBlueprints = [
  {
    scenario: '월급일 직후 소비, 자동이체, 고정지출 정리',
    framing: '친구 조언이 섞인 현실 대화형',
    focus: '실수 예방과 첫 행동 선택',
  },
  {
    scenario: '자취, 배달앱, 장보기, 생활비 부족',
    framing: '하루 생활 흐름을 따라가는 상황형',
    focus: '불필요한 선택지 구분',
  },
  {
    scenario: '카드값, 할부, 통장잔고, 청구일 직전 판단',
    framing: '짧은 사례 분석형',
    focus: '가장 합리적인 다음 행동',
  },
  {
    scenario: '사회초년생, 첫 재무목표, 저축과 소비 충돌',
    framing: '계획 세우기형',
    focus: '원칙 적용과 우선순위',
  },
];

const getQuizVariationBlueprint = (quizId) => {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  let hash = hourBucket;

  for (const character of String(quizId)) {
    hash = ((hash << 5) - hash) + character.charCodeAt(0);
    hash |= 0;
  }

  return quizVariationBlueprints[Math.abs(hash) % quizVariationBlueprints.length];
};

const buildQuizPrompts = ({ quiz, unit, topic }, locale = 'ko') => {
  const isEnglish = locale === 'en';
  const seedQuestions = (quiz.questions || []).slice(0, 2).map((item, index) => ({
    no: index + 1,
    question: item.question,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
  }));
  const styleExamples = getQuizExamplesForUnit(unit?.id).slice(0, 10).map((item, index) => ({
    no: index + 1,
    concept: item.concept,
    prompt: item.prompt,
    answerHint: item.answerHint,
    intent: item.intent,
  }));
  const variationBlueprint = getQuizVariationBlueprint(quiz.id);

  const topicContext = {
      title: topic?.title || unit?.title || quiz.unitTitle || '금융 교육',
      summary: topic?.summary || '',
      goals: (topic?.goals || []).slice(0, 3),
      concepts: (topic?.concepts || []).slice(0, 3),
    };

  const systemPrompt = [
    isEnglish
      ? 'You create English-language financial education quizzes for learners.'
      : '당신은 한국어 금융 교육 퀴즈를 만드는 출제자다.',
    isEnglish
      ? 'Always create exactly 5 medium-difficulty multiple-choice questions with 4 options each.'
      : '항상 중급 난이도의 4지선다 객관식 5문항을 만든다.',
    isEnglish
      ? 'Every question must be grounded in a practical daily-life context or a short scenario.'
      : '모든 문항은 실생활 맥락 또는 짧은 사례 기반으로 작성한다.',
    isEnglish
      ? 'Options must be clearly distinguishable and there must be exactly one correct answer.'
      : '보기는 서로 구분 가능해야 하며 정답은 단 하나여야 한다.',
    isEnglish
      ? 'Wrong options may be plausible but must not be near-duplicates, wordplay, or trick answers.'
      : '오답 보기는 정답과 헷갈릴 수는 있지만, 서로 거의 같은 표현이거나 말장난처럼 보이면 안 된다.',
    isEnglish
      ? 'Questions should be concise but still include enough context and conditions to make the intent clear.'
      : '문항은 짧아도 핵심 상황과 조건이 드러나야 하며, 질문 의도가 불명확하면 안 된다.',
    isEnglish
      ? 'The explanation must match the correct answer and explain the reasoning in about two sentences.'
      : '해설은 정답과 반드시 일치해야 하며, 정답 선택의 근거를 2문장 안팎으로 설명한다.',
    isEnglish
      ? 'The explanation should make clear why the correct answer is right and why the others are not.'
      : '해설에는 왜 정답이고 왜 다른 선택지가 아닌지 드러나는 근거가 들어가야 한다.',
    isEnglish
      ? 'Do not make the answer obvious from the question wording or option length alone.'
      : '정답이 질문 문장에 노출되거나 보기 길이 차이만으로 티 나지 않게 작성한다.',
    isEnglish
      ? 'Do not copy the reference examples. Assess the same learning goals in a fresh way.'
      : '기존 예시와 문장 구조나 수치를 그대로 복사하지 말고, 같은 학습 목표를 새 방식으로 평가한다.',
    isEnglish
      ? 'Avoid repeating the same character setup, numbers, or scenario flow from the examples.'
      : '예시 문항과 같은 인물 설정, 같은 숫자, 같은 상황 전개를 반복하지 않는다.',
    isEnglish
      ? 'Use different everyday settings, option structures, and question angles.'
      : '반드시 다른 생활 장면, 다른 선택지 구성, 다른 질문 각도로 변형한다.',
    isEnglish
      ? 'Use the style examples only as calibration references and never copy their phrasing.'
      : '제공된 스타일 예시는 학습용 기준점으로만 참고하고, 문장을 베끼지 않는다.',
    isEnglish
      ? 'If a unit has style examples, prioritize their difficulty, concept accuracy, and practical usefulness.'
      : '스타일 예시가 있는 단원은 해당 예시의 난이도, 개념 정확도, 실전성을 우선적으로 따른다.',
    isEnglish
      ? 'Return only values that conform to the JSON Schema.'
      : '결과는 반드시 JSON Schema에 맞는 값만 반환한다.',
  ].join(' ');

  const userPrompt = JSON.stringify(
    {
      request: {
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizSubtitle: quiz.subtitle,
        unitTitle: unit?.title || quiz.unitTitle,
        questionCount: 5,
        audience: isEnglish ? 'English-speaking young adult financial education learners' : '한국어 사용자, 청년 금융교육 학습자',
      },
      variationBlueprint,
      topicContext,
      referenceQuestions: seedQuestions,
      styleExamples,
      outputRules: {
        language: isEnglish ? 'en-US' : 'ko-KR',
        optionCount: 4,
        answerIndexRange: [0, 3],
        avoid: [
          '예시 문제의 문장 재사용',
          '예시 문제와 같은 등장인물/나이/숫자 조합',
          '정답 위치 패턴 반복',
          '모호한 보기',
          '근거 없는 최신 통계 수치',
          '모두 정답/정답 없음 보기',
          '서로 거의 같은 보기 2개',
          '설명 없는 숫자 문제',
        ],
        prioritize: [
          '정책·기관·제도 이름을 물을 때는 헷갈리기 쉬운 보기를 만든다',
          '문항은 청년이 실제로 접할 법한 뉴스, 소비, 취업, 금융 플랫폼 상황과 연결한다',
          '해설에는 개념 정의보다 왜 그 선택지가 맞는지가 드러나야 한다',
        ],
      },
    },
    null,
    2
  );

  return { systemPrompt, userPrompt };
};

const extractResponseText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textParts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join('\n').trim();
};

const translateWithSchema = async ({ cacheKey, schemaName, schema, systemPrompt, userPrompt }) => {
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const cached = translationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const inflight = translationInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const requestPromise = (async () => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'OpenAI translation request failed');
    }

    const outputText = extractResponseText(payload);
    if (!outputText) {
      throw new Error('OpenAI returned an empty translation response');
    }

    const parsed = JSON.parse(outputText);
    translationCache.set(cacheKey, {
      data: parsed,
      expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
    });
    return parsed;
  })();

  translationInflight.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    translationInflight.delete(cacheKey);
  }
};

const translateLessonChunk = async (lessonChunk, locale = 'ko') => {
  if (normalizeLocale(locale) !== 'en') {
    return lessonChunk;
  }

  const payload = {
    title: lessonChunk.title,
    summary: lessonChunk.summary,
    goals: lessonChunk.goals || [],
    concepts: lessonChunk.concepts || [],
    learningPoints: (lessonChunk.learningPoints || []).map((point) => ({
      emoji: point.emoji,
      title: point.title,
      content: point.content || '',
      pointType: point.pointType || 'text',
    })),
  };

  return translateWithSchema({
    cacheKey: getTranslationCacheKey('lesson-chunk', 'en', payload),
    schemaName: 'translated_lesson_chunk',
    schema: translatedLessonChunkSchema,
    systemPrompt: 'Translate the provided Korean financial learning content into natural, learner-friendly English. Preserve structure, emoji, and pointType exactly. Do not summarize or omit details. Return only JSON matching the schema.',
    userPrompt: JSON.stringify(payload, null, 2),
  });
};

const translateQuizQuestions = async (questions, locale = 'ko') => {
  if (normalizeLocale(locale) !== 'en') {
    return { questions };
  }

  const payload = { questions };
  return translateWithSchema({
    cacheKey: getTranslationCacheKey('quiz-questions', 'en', payload),
    schemaName: 'translated_quiz_questions',
    schema: quizResponseSchema,
    systemPrompt: 'Translate the provided Korean quiz questions into natural English. Keep the same number of questions, the same answer indexes, and the same structure. Return only JSON matching the schema.',
    userPrompt: JSON.stringify(payload, null, 2),
  });
};

const maskEmailAddress = (email) => {
  if (!email || !email.includes('@')) {
    return '';
  }

  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0] || ''}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${'*'.repeat(Math.max(2, localPart.length - 2))}@${domain}`;
};

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('AI quiz payload must contain exactly 5 questions');
  }

  return questions.map((question, index) => {
    if (
      typeof question?.question !== 'string' ||
      !Array.isArray(question?.options) ||
      question.options.length !== 4 ||
      !Number.isInteger(question?.answer) ||
      question.answer < 0 ||
      question.answer > 3 ||
      typeof question?.explanation !== 'string'
    ) {
      throw new Error(`AI quiz payload is invalid at index ${index}`);
    }

    return {
      question: question.question.trim(),
      options: question.options.map((option) => String(option).trim()),
      answer: question.answer,
      explanation: question.explanation.trim(),
    };
  });
};

const normalizeComparableText = (value) => String(value || '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/[^\p{L}\p{N}%]/gu, '')
  .trim();

const maskApiKey = (value) => {
  if (!value || value.length < 12) {
    return 'missing';
  }

  return `${value.slice(0, 7)}...${value.slice(-4)}`;
};

const hasDuplicateOptions = (options) => {
  const normalized = options.map(normalizeComparableText).filter(Boolean);
  return new Set(normalized).size !== normalized.length;
};

const getQuestionQualityIssues = (question, index) => {
  const issues = [];
  const questionText = question.question.trim();
  const explanationText = question.explanation.trim();
  const options = question.options.map((option) => String(option || '').trim());

  if (questionText.length < 14) {
    issues.push(`question ${index + 1}: question is too short`);
  }

  if (explanationText.length < 18) {
    issues.push(`question ${index + 1}: explanation is too short`);
  }

  if (options.some((option) => option.length < 2)) {
    issues.push(`question ${index + 1}: option text is too short`);
  }

  if (hasDuplicateOptions(options)) {
    issues.push(`question ${index + 1}: duplicate or near-duplicate options`);
  }

  if (options.some((option) => ['모두 정답', '모두 맞다', '모두 틀리다', '정답 없음', '해당 없음'].includes(option))) {
    issues.push(`question ${index + 1}: contains low-quality catch-all option`);
  }

  const optionLengths = options.map((option) => option.length);
  const minOptionLength = Math.min(...optionLengths);
  const maxOptionLength = Math.max(...optionLengths);
  if (maxOptionLength - minOptionLength > 40) {
    issues.push(`question ${index + 1}: option lengths are unbalanced`);
  }

  return issues;
};

const validateQuestionSetQuality = (questions) => {
  const issues = [];
  const seenPrompts = new Set();

  questions.forEach((question, index) => {
    const normalizedPrompt = normalizeComparableText(question.question);
    if (normalizedPrompt && seenPrompts.has(normalizedPrompt)) {
      issues.push(`question ${index + 1}: duplicate prompt`);
    }
    if (normalizedPrompt) {
      seenPrompts.add(normalizedPrompt);
    }

    issues.push(...getQuestionQualityIssues(question, index));
  });

  return {
    passed: issues.length === 0,
    issues,
  };
};

const applySecurityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  next();
};

const createRateLimiter = ({ key, limit, windowMs }) => (req, res, next) => {
  const clientKey = `${key}:${req.ip || 'unknown'}`;
  const now = Date.now();
  const entry = rateLimitStore.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
    return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' });
  }

  entry.count += 1;
  rateLimitStore.set(clientKey, entry);
  return next();
};

const generateAiQuizQuestions = async (quizId, options = {}) => {
  const { forceRefresh = false, locale = 'ko' } = options;
  const normalizedLocale = normalizeLocale(locale);

  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const context = buildQuizContext(quizId);
  if (!context) {
    const error = new Error('Quiz not found');
    error.statusCode = 404;
    throw error;
  }

  const cacheKey = `${quizId}:${normalizedLocale}`;
  const cached = aiQuizCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.questions;
  }

  const inflight = !forceRefresh ? aiQuizInflight.get(cacheKey) : null;
  if (inflight) {
    return inflight;
  }

  if (forceRefresh) {
    aiQuizCache.delete(cacheKey);
    aiQuizInflight.delete(cacheKey);
  }

  const requestPromise = (async () => {
    const { systemPrompt, userPrompt } = buildQuizPrompts(context, normalizedLocale);
    const qualityFailures = [];
    let questions = null;

    for (let attempt = 1; attempt <= MAX_AI_QUIZ_ATTEMPTS; attempt += 1) {
      console.info(
        `[AI quiz] OpenAI request started quizId=${quizId} attempt=${attempt}/${MAX_AI_QUIZ_ATTEMPTS} model=${openAiModel} key=${maskApiKey(openAiApiKey)}`
      );

      const startedAt = Date.now();
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: systemPrompt }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: userPrompt }],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'quiz_questions',
              strict: true,
              schema: quizResponseSchema,
            },
          },
        }),
      });

      const payload = await response.json();
      const elapsedMs = Date.now() - startedAt;

      if (!response.ok) {
        const errorMessage = payload?.error?.message || 'OpenAI request failed';
        console.error(
          `[AI quiz] OpenAI request failed quizId=${quizId} attempt=${attempt}/${MAX_AI_QUIZ_ATTEMPTS} status=${response.status} elapsedMs=${elapsedMs} message=${errorMessage}`
        );
        const error = new Error(errorMessage);
        error.statusCode = response.status;
        throw error;
      }

      console.info(
        `[AI quiz] OpenAI request succeeded quizId=${quizId} attempt=${attempt}/${MAX_AI_QUIZ_ATTEMPTS} status=${response.status} elapsedMs=${elapsedMs}`
      );

      const outputText = extractResponseText(payload);
      if (!outputText) {
        console.error(`[AI quiz] Empty OpenAI response quizId=${quizId} attempt=${attempt}/${MAX_AI_QUIZ_ATTEMPTS}`);
        throw new Error('OpenAI returned an empty response');
      }

      const parsed = JSON.parse(outputText);
      const normalizedQuestions = normalizeQuestions(parsed.questions);
      const qualityCheck = validateQuestionSetQuality(normalizedQuestions);

      if (qualityCheck.passed) {
        questions = normalizedQuestions;
        console.info(
          `[AI quiz] Quiz generation accepted quizId=${quizId} questionCount=${normalizedQuestions.length} attempt=${attempt}/${MAX_AI_QUIZ_ATTEMPTS}`
        );
        break;
      }

      qualityFailures.push(`attempt ${attempt}: ${qualityCheck.issues.join('; ')}`);
      console.warn(`AI quiz quality retry for ${quizId} (attempt ${attempt})`, qualityCheck.issues);
    }

    if (!questions) {
      console.error(`[AI quiz] Quiz generation rejected quizId=${quizId} reasons=${qualityFailures.join(' | ')}`);
      throw new Error(`AI quiz quality validation failed: ${qualityFailures.join(' | ')}`);
    }

    aiQuizCache.set(cacheKey, {
      questions,
      expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
    });

    return questions;
  })();

  aiQuizInflight.set(cacheKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    aiQuizInflight.delete(cacheKey);
  }
};

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(applySecurityHeaders);
app.use(express.json({ limit: '32kb' }));

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'finapple-payments' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/finance-chat/questions', (_req, res) => {
  const locale = String(_req.query?.locale || 'ko');
  res.json({ questions: getYouthCoreQuestions(locale) });
});

app.post('/api/finance-chat', createRateLimiter({ key: 'finance-chat', limit: 60, windowMs: 60_000 }), async (req, res) => {
  const query = String(req.body?.query || '').trim();
  const locale = String(req.body?.locale || req.query?.locale || 'ko');
  const ownedDocumentsRaw = Array.isArray(req.body?.owned_documents) ? req.body.owned_documents : [];
  const ownedDocuments = ownedDocumentsRaw.map((item) => String(item || '').trim()).filter(Boolean);

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const response = buildFinanceChatResponse({ query, ownedDocuments, locale });
    const assistantMessage = await generateFinanceNarrative({
      query,
      result: response,
      openAiApiKey,
      model: openAiModel,
      locale,
    });
    return res.json({
      ...response,
      assistant_message: assistantMessage,
    });
  } catch (error) {
    console.error('Finance chat failed:', error);
    return res.status(500).json({ error: 'finance chat failed' });
  }
});

app.post('/api/account/find-email', createRateLimiter({ key: 'find-email', limit: 10, windowMs: 60_000 }), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const nickname = String(req.body?.nickname || '').trim();
  if (!nickname) {
    return res.status(400).json({ error: 'nickname is required' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.email) {
      return res.status(404).json({ error: '일치하는 계정을 찾지 못했어요.' });
    }

    return res.json({
      success: true,
      maskedEmail: maskEmailAddress(data.email),
    });
  } catch (error) {
    console.error('find-email error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to find email' });
  }
});

app.post('/api/account/delete', createRateLimiter({ key: 'account-delete', limit: 5, windowMs: 60_000 }), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const { accessToken } = req.body || {};
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken is required' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const userId = authData.user.id;

    const { error: profileDeleteError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileDeleteError) {
      throw profileDeleteError;
    }

    const { error: leaderboardDeleteError } = await supabaseAdmin
      .from('leaderboard_entries')
      .delete()
      .eq('user_id', userId);

    if (leaderboardDeleteError) {
      throw leaderboardDeleteError;
    }

    const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (userDeleteError) {
      throw userDeleteError;
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('account delete error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to delete account' });
  }
});

const handleReadUserState = async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const accessToken = getRequestAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ error: '로그인 세션이 필요합니다.' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const state = await resolveUserHeartsState(authData.user);

    return res.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error('user state fetch error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch user state' });
  }
};

app.get('/api/user-state', handleReadUserState);
app.post('/api/user-state/read', handleReadUserState);

app.post('/api/user-state/consume-heart', createRateLimiter({ key: 'user-state-consume-heart', limit: 120, windowMs: 60_000 }), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const accessToken = getRequestAccessToken(req);

  if (!accessToken) {
    return res.status(401).json({ error: '로그인 세션이 필요합니다.' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const currentState = await resolveUserHeartsState(authData.user);
    if (Boolean(authData.user.user_metadata?.is_premium)) {
      return res.json({ success: true, state: currentState });
    }

    const nextHearts = Math.max(0, (currentState.hearts ?? 0) - 1);
    const { data, error } = await supabaseAdmin
      .from('user_progress_state')
      .upsert({
        user_id: authData.user.id,
        user_email: authData.user.email,
        hearts: nextHearts,
        hearts_last_reset: currentState.heartsLastReset,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('hearts, hearts_last_reset, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      state: {
        hearts: data.hearts,
        heartsLastReset: data.hearts_last_reset,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('user state consume heart error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to consume heart' });
  }
});

const handleFindAdminUser = async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const accessToken = getRequestAccessToken(req);
  const query = String(req.query?.query || req.body?.query || '').trim();

  if (!accessToken) {
    return res.status(401).json({ error: '로그인 세션이 필요합니다.' });
  }

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    if (!isAdminAuthUser(authData.user)) {
      return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }

    const lookup = query.includes('@')
      ? supabaseAdmin.from('user_profiles').select('user_id, email, nickname, avatar_url').eq('email', query).maybeSingle()
      : supabaseAdmin.from('user_profiles').select('user_id, email, nickname, avatar_url').eq('nickname', query).maybeSingle();

    const { data: profile, error } = await lookup;
    if (error) {
      throw error;
    }

    if (!profile) {
      return res.status(404).json({ error: '일치하는 사용자를 찾지 못했습니다.' });
    }

    const user = await buildManagedUserResponse(profile);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('admin user fetch error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin user' });
  }
};

app.get('/api/admin/user', handleFindAdminUser);
app.post('/api/admin/user/find', handleFindAdminUser);

app.post('/api/admin/user', createRateLimiter({ key: 'admin-user-update', limit: 60, windowMs: 60_000 }), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const accessToken = getRequestAccessToken(req);
  const userId = String(req.body?.userId || '').trim();
  const heartsInput = req.body?.hearts;
  const premiumInput = req.body?.isPremium;
  const hasHeartsUpdate = heartsInput !== undefined;
  const hasPremiumUpdate = premiumInput !== undefined;
  const hearts = hasHeartsUpdate ? validateHearts(heartsInput) : null;
  const isPremium = hasPremiumUpdate ? Boolean(premiumInput) : null;

  if (!accessToken) {
    return res.status(401).json({ error: '로그인 세션이 필요합니다.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!hasHeartsUpdate && !hasPremiumUpdate) {
    return res.status(400).json({ error: 'hearts or isPremium is required' });
  }

  if (hasHeartsUpdate && hearts === null) {
    return res.status(400).json({ error: 'hearts must be an integer between 0 and 5' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    if (!isAdminAuthUser(authData.user)) {
      return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, email, nickname, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return res.status(404).json({ error: '수정할 사용자를 찾지 못했습니다.' });
    }

    if (hasHeartsUpdate) {
      const { error: stateError } = await supabaseAdmin
        .from('user_progress_state')
        .upsert({
          user_id: profile.user_id,
          user_email: profile.email,
          hearts,
          hearts_last_reset: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
          updated_by_user_id: authData.user.id,
          updated_by_email: authData.user.email,
        }, { onConflict: 'user_id' });

      if (stateError) {
        throw stateError;
      }
    }

    if (hasPremiumUpdate) {
      const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
      if (targetUserError) {
        throw targetUserError;
      }

      const currentMetadata = targetUserData?.user?.user_metadata || {};
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
        user_metadata: {
          ...currentMetadata,
          is_premium: isPremium,
          premium_updated_at: new Date().toISOString(),
          premium_updated_by_admin: authData.user.email || authData.user.id,
        },
      });

      if (updateError) {
        throw updateError;
      }
    }

    const user = await buildManagedUserResponse(profile);
    return res.json({ success: true, user });
  } catch (error) {
    console.error('admin user update error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to update admin user' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const seasonKey = String(req.query.seasonKey || getCurrentSeasonMeta().seasonKey);
  const LEADERBOARD_SELECT_BASE = 'user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at';
  const LEADERBOARD_SELECT_WITH_TRACKS = `${LEADERBOARD_SELECT_BASE}, score_youth, score_start, score_one`;
  const isMissingTrackScoreColumn = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === '42703' || message.includes('score_youth') || message.includes('score_start') || message.includes('score_one');
  };

  try {
    let { data, error } = await supabaseAdmin
      .from('leaderboard_entries')
      .select(LEADERBOARD_SELECT_WITH_TRACKS)
      .eq('season_key', seasonKey)
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (error && isMissingTrackScoreColumn(error)) {
      const fallback = await supabaseAdmin
        .from('leaderboard_entries')
        .select(LEADERBOARD_SELECT_BASE)
        .eq('season_key', seasonKey)
        .order('score', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(limit);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    return res.json({ entries: data || [] });
  } catch (error) {
    console.error('leaderboard fetch error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
  }
});

app.get('/api/leaderboard/profile', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const LEADERBOARD_SELECT_BASE = 'user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at';
    const LEADERBOARD_SELECT_WITH_TRACKS = `${LEADERBOARD_SELECT_BASE}, score_youth, score_start, score_one`;
    const isMissingTrackScoreColumn = (error) => {
      const message = String(error?.message || '').toLowerCase();
      return error?.code === '42703' || message.includes('score_youth') || message.includes('score_start') || message.includes('score_one');
    };

    let [currentResult, historyResult] = await Promise.all([
      supabaseAdmin
        .from('leaderboard_entries')
        .select(LEADERBOARD_SELECT_WITH_TRACKS)
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('leaderboard_entry_history')
        .select(LEADERBOARD_SELECT_WITH_TRACKS)
        .eq('user_id', userId)
        .order('season_start_date', { ascending: false })
        .limit(8),
    ]);

    if ((currentResult.error && isMissingTrackScoreColumn(currentResult.error)) || (historyResult.error && isMissingTrackScoreColumn(historyResult.error))) {
      [currentResult, historyResult] = await Promise.all([
        supabaseAdmin
          .from('leaderboard_entries')
          .select(LEADERBOARD_SELECT_BASE)
          .eq('user_id', userId)
          .maybeSingle(),
        supabaseAdmin
          .from('leaderboard_entry_history')
          .select(LEADERBOARD_SELECT_BASE)
          .eq('user_id', userId)
          .order('season_start_date', { ascending: false })
          .limit(8),
      ]);
    }

    if (currentResult.error) {
      throw currentResult.error;
    }

    if (historyResult.error && historyResult.error.code !== '42P01') {
      throw historyResult.error;
    }

    const profile = currentResult.data || null;
    const seasons = historyResult.data?.length ? historyResult.data : (profile ? [profile] : []);

    return res.json({ profile, seasons });
  } catch (error) {
    console.error('leaderboard profile fetch error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch leaderboard profile' });
  }
});

app.post('/api/leaderboard/sync', createRateLimiter({ key: 'leaderboard-sync', limit: 45, windowMs: 60_000 }), async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const { accessToken, entry } = req.body || {};
  if (!accessToken || !entry) {
    return res.status(400).json({ error: 'accessToken and entry are required' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const LEADERBOARD_SELECT_BASE = 'user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at';
    const LEADERBOARD_SELECT_WITH_TRACKS = `${LEADERBOARD_SELECT_BASE}, score_youth, score_start, score_one`;
    const isMissingTrackScoreColumn = (error) => {
      const message = String(error?.message || '').toLowerCase();
      return error?.code === '42703' || message.includes('score_youth') || message.includes('score_start') || message.includes('score_one');
    };
    const scoreYouth = Number(entry?.trackScores?.youth) || 0;
    const scoreStart = Number(entry?.trackScores?.start) || 0;
    const scoreOne = Number(entry?.trackScores?.one) || 0;
    const combinedScore = scoreYouth + scoreStart + scoreOne;
    const payload = {
      user_id: authData.user.id,
      user_email: authData.user.email,
      display_name: entry.displayName || authData.user.email || '학습자',
      avatar_url: entry.avatarUrl || '',
      season_key: entry.seasonKey || getCurrentSeasonMeta().seasonKey,
      season_label: entry.seasonLabel || getCurrentSeasonMeta().label,
      season_start_date: entry.seasonStartDate || getCurrentSeasonMeta().startDate,
      season_end_date: entry.seasonEndDate || getCurrentSeasonMeta().endDate,
      xp: Number(entry.xp) || 0,
      streak_count: Number(entry.streakCount) || 1,
      best_streak: Number(entry.bestStreak) || 1,
      streak_freezers: Number(entry.streakFreezers) || 0,
      completed_count: Number(entry.completedCount) || 0,
      active_review_count: Number(entry.activeReviewCount) || 0,
      resolved_review_count: Number(entry.resolvedReviewCount) || 0,
      ads_disabled: Boolean(entry.adsDisabled),
      score: combinedScore > 0 ? combinedScore : (Number(entry.score) || 0),
      score_youth: scoreYouth,
      score_start: scoreStart,
      score_one: scoreOne,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabaseAdmin
      .from('leaderboard_entries')
      .upsert(payload, { onConflict: 'user_id' })
      .select(LEADERBOARD_SELECT_WITH_TRACKS)
      .single();

    if (error && isMissingTrackScoreColumn(error)) {
      const { score_youth, score_start, score_one, ...legacyPayload } = payload;
      const fallback = await supabaseAdmin
        .from('leaderboard_entries')
        .upsert(legacyPayload, { onConflict: 'user_id' })
        .select(LEADERBOARD_SELECT_BASE)
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    let { error: historyError } = await supabaseAdmin
      .from('leaderboard_entry_history')
      .upsert(payload, { onConflict: 'user_id,season_key' });

    if (historyError && isMissingTrackScoreColumn(historyError)) {
      const { score_youth, score_start, score_one, ...legacyPayload } = payload;
      const fallback = await supabaseAdmin
        .from('leaderboard_entry_history')
        .upsert(legacyPayload, { onConflict: 'user_id,season_key' });
      historyError = fallback.error;
    }

    if (historyError && historyError.code !== '42P01') {
      throw historyError;
    }

    return res.json({ success: true, entry: data });
  } catch (error) {
    console.error('leaderboard sync error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to sync leaderboard' });
  }
});

app.post('/api/quizzes/generate', createRateLimiter({ key: 'quiz-generate', limit: 25, windowMs: 60_000 }), async (req, res) => {
  const { quizId, forceRefresh = false, locale = 'ko' } = req.body || {};

  if (!quizId) {
    return res.status(400).json({ error: 'quizId is required' });
  }

  try {
    const normalizedLocale = normalizeLocale(locale);
    const questions = await generateAiQuizQuestions(String(quizId), {
      forceRefresh: Boolean(forceRefresh),
      locale: normalizedLocale,
    });
    return res.json({
      success: true,
      source: 'openai',
      model: openAiModel,
      locale: normalizedLocale,
      questions,
    });
  } catch (error) {
    console.error('quiz generate error', error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'AI quiz generation failed',
    });
  }
});

app.post('/api/content/translate', createRateLimiter({ key: 'content-translate', limit: 25, windowMs: 60_000 }), async (req, res) => {
  const { type, locale = 'ko', payload } = req.body || {};
  const normalizedLocale = normalizeLocale(locale);

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'payload is required' });
  }

  try {
    if (type === 'lessonChunk') {
      const translated = await translateLessonChunk(payload, normalizedLocale);
      return res.json({ success: true, locale: normalizedLocale, content: translated });
    }

    if (type === 'quizQuestions') {
      const translated = await translateQuizQuestions(payload.questions || [], normalizedLocale);
      return res.json({ success: true, locale: normalizedLocale, content: translated.questions });
    }

    return res.status(400).json({ error: 'Unsupported translation type' });
  } catch (error) {
    console.error('content translate error', error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Content translation failed',
    });
  }
});

app.post('/api/payments/toss/create-checkout', createRateLimiter({ key: 'toss-checkout', limit: 10, windowMs: 60_000 }), async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  const { amount, orderId, orderName, customerName, customerEmail, successUrl, failUrl } = req.body;

  if (amount !== PREMIUM_PRICE) {
    return res.status(400).json({ error: 'Unexpected premium amount' });
  }

  if (!orderId || !String(orderId).startsWith('premium_monthly_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  if (!isAllowedCallbackUrl(successUrl) || !isAllowedCallbackUrl(failUrl)) {
    return res.status(400).json({ error: 'Invalid payment redirect URL' });
  }

  try {
    const response = await axios.post(
      'https://api.tosspayments.com/v1/payments',
      {
        method: 'CARD',
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl,
        failUrl,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({
      success: true,
      checkoutUrl: response.data?.checkout?.url,
    });
  } catch (error) {
    console.error('toss create-checkout error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/toss/create-survival-coin-checkout', createRateLimiter({ key: 'toss-survival-coin-checkout', limit: 10, windowMs: 60_000 }), async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  const { amount, orderId, orderName, customerName, customerEmail, successUrl, failUrl } = req.body;

  if (amount !== SURVIVAL_COIN_PACK_PRICE) {
    return res.status(400).json({ error: 'Unexpected survival coin pack amount' });
  }

  if (!orderId || !String(orderId).startsWith('survival_coinpack_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  if (!isAllowedCallbackUrl(successUrl) || !isAllowedCallbackUrl(failUrl)) {
    return res.status(400).json({ error: 'Invalid payment redirect URL' });
  }

  try {
    const response = await axios.post(
      'https://api.tosspayments.com/v1/payments',
      {
        method: 'CARD',
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl,
        failUrl,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({
      success: true,
      checkoutUrl: response.data?.checkout?.url,
    });
  } catch (error) {
    console.error('toss create-survival-coin-checkout error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/toss/confirm', createRateLimiter({ key: 'toss-confirm', limit: 12, windowMs: 60_000 }), async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const { paymentKey, orderId, amount, accessToken } = req.body;

  if (!paymentKey || !orderId || !amount || !accessToken) {
    return res.status(400).json({ error: 'paymentKey, orderId, amount, accessToken are required' });
  }

  if (Number(amount) !== PREMIUM_PRICE) {
    return res.status(400).json({ error: 'Unexpected premium amount' });
  }

  if (!String(orderId).startsWith('premium_monthly_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const tossResponse = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        paymentKey,
        orderId,
        amount: Number(amount),
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `confirm-${orderId}`,
        },
      }
    );

    const existingMetadata = authData.user.user_metadata || {};
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: {
        ...existingMetadata,
        is_premium: true,
        premium_plan: 'monthly',
        premium_updated_at: new Date().toISOString(),
        premium_payment_key: paymentKey,
        premium_order_id: orderId,
      },
    });

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      payment: tossResponse.data,
    });
  } catch (error) {
    console.error('toss confirm error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/toss/confirm-survival-coin', createRateLimiter({ key: 'toss-confirm-survival-coin', limit: 12, windowMs: 60_000 }), async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  const { paymentKey, orderId, amount } = req.body;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'paymentKey, orderId, amount are required' });
  }

  if (Number(amount) !== SURVIVAL_COIN_PACK_PRICE) {
    return res.status(400).json({ error: 'Unexpected survival coin pack amount' });
  }

  if (!String(orderId).startsWith('survival_coinpack_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  try {
    const tossResponse = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        paymentKey,
        orderId,
        amount: Number(amount),
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `confirm-survival-coin-${orderId}`,
        },
      }
    );

    return res.json({
      success: true,
      payment: tossResponse.data,
    });
  } catch (error) {
    console.error('toss confirm-survival-coin error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/kakao/create-checkout', async (req, res) => {
  if (!kakaoAdminKey) return res.status(500).json({ error: 'KAKAO_ADMIN_KEY is not configured' });

  const { cid, partner_order_id, partner_user_id, item_name, quantity, total_amount, tax_free_amount, approval_url, fail_url, cancel_url } = req.body;
  if (!isAllowedCallbackUrl(approval_url) || !isAllowedCallbackUrl(fail_url) || !isAllowedCallbackUrl(cancel_url)) {
    return res.status(400).json({ error: 'Invalid payment redirect URL' });
  }

  try {
    const response = await axios.post(
      'https://kapi.kakao.com/v1/payment/ready',
      new URLSearchParams({
        cid,
        partner_order_id,
        partner_user_id,
        item_name,
        quantity,
        total_amount,
        vat_amount: tax_free_amount || 0,
        tax_free_amount: tax_free_amount || 0,
        approval_url,
        fail_url,
        cancel_url,
      }),
      {
        headers: {
          Authorization: `KakaoAK ${kakaoAdminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('kakao create-checkout error', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Payment backend running on port ${PORT}`);
  const configSummary = getServerConfigSummary();

  if (configSummary.requiredMissing.length > 0) {
    console.warn(`[startup] Missing required server env: ${configSummary.requiredMissing.join(', ')}`);
  }

  if (configSummary.recommendedMissing.length > 0) {
    console.warn(`[startup] Missing recommended server env: ${configSummary.recommendedMissing.join(', ')}`);
  }

  console.log(`[startup] Allowed frontend origins: ${Array.from(allowedOrigins).filter(Boolean).join(', ')}`);
  console.log(`[startup] Healthcheck: http://127.0.0.1:${PORT}/api/health`);
});
