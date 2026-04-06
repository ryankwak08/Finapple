import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuizById, getUnitById } from '../src/lib/quizData.js';
import { studyTopics } from '../src/lib/studyData.js';
import { getCurrentSeasonMeta } from '../src/lib/season.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const tossSecretKey = process.env.TOSS_SECRET_KEY;
const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PREMIUM_PRICE = 9900;
const PORT = process.env.PORT || 3000;
const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const aiQuizCache = new Map();
const aiQuizInflight = new Map();
const rateLimitStore = new Map();
const MAX_AI_QUIZ_ATTEMPTS = 1;

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

const allowedOrigins = new Set([
  normalizeOrigin(FRONTEND_URL),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
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

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const buildQuizContext = (quizId) => {
  const quiz = getQuizById(quizId);
  if (!quiz) {
    return null;
  }

  const unit = getUnitById(quiz.unitId);
  const topic = unit
    ? studyTopics.find((item) => item.id === unit.studyTopicId)
    : null;

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

const buildQuizPrompts = ({ quiz, unit, topic }) => {
  const seedQuestions = (quiz.questions || []).slice(0, 2).map((item, index) => ({
    no: index + 1,
    question: item.question,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
  }));
  const variationBlueprint = getQuizVariationBlueprint(quiz.id);

  const topicContext = {
      title: topic?.title || unit?.title || quiz.unitTitle || '금융 교육',
      summary: topic?.summary || '',
      goals: (topic?.goals || []).slice(0, 3),
      concepts: (topic?.concepts || []).slice(0, 3),
    };

  const systemPrompt = [
    '당신은 한국어 금융 교육 퀴즈를 만드는 출제자다.',
    '항상 중급 난이도의 4지선다 객관식 5문항을 만든다.',
    '모든 문항은 실생활 맥락 또는 짧은 사례 기반으로 작성한다.',
    '보기는 서로 구분 가능해야 하며 정답은 단 하나여야 한다.',
    '오답 보기는 정답과 헷갈릴 수는 있지만, 서로 거의 같은 표현이거나 말장난처럼 보이면 안 된다.',
    '문항은 짧아도 핵심 상황과 조건이 드러나야 하며, 질문 의도가 불명확하면 안 된다.',
    '해설은 정답과 반드시 일치해야 하며, 정답 선택의 근거를 2문장 안팎으로 설명한다.',
    '해설에는 왜 정답이고 왜 다른 선택지가 아닌지 드러나는 근거가 들어가야 한다.',
    '정답이 질문 문장에 노출되거나 보기 길이 차이만으로 티 나지 않게 작성한다.',
    '기존 예시와 문장 구조나 수치를 그대로 복사하지 말고, 같은 학습 목표를 새 방식으로 평가한다.',
    '예시 문항과 같은 인물 설정, 같은 숫자, 같은 상황 전개를 반복하지 않는다.',
    '반드시 다른 생활 장면, 다른 선택지 구성, 다른 질문 각도로 변형한다.',
    '결과는 반드시 JSON Schema에 맞는 값만 반환한다.',
  ].join(' ');

  const userPrompt = JSON.stringify(
    {
      request: {
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizSubtitle: quiz.subtitle,
        unitTitle: unit?.title || quiz.unitTitle,
        questionCount: 5,
        audience: '한국어 사용자, 청년 금융교육 학습자',
      },
      variationBlueprint,
      topicContext,
      referenceQuestions: seedQuestions,
      outputRules: {
        language: 'ko-KR',
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
  const { forceRefresh = false } = options;

  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const context = buildQuizContext(quizId);
  if (!context) {
    const error = new Error('Quiz not found');
    error.statusCode = 404;
    throw error;
  }

  const cached = aiQuizCache.get(quizId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.questions;
  }

  const inflight = !forceRefresh ? aiQuizInflight.get(quizId) : null;
  if (inflight) {
    return inflight;
  }

  if (forceRefresh) {
    aiQuizCache.delete(quizId);
    aiQuizInflight.delete(quizId);
  }

  const requestPromise = (async () => {
    const { systemPrompt, userPrompt } = buildQuizPrompts(context);
    const qualityFailures = [];
    let questions = null;

    for (let attempt = 1; attempt <= MAX_AI_QUIZ_ATTEMPTS; attempt += 1) {
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

      if (!response.ok) {
        const errorMessage = payload?.error?.message || 'OpenAI request failed';
        const error = new Error(errorMessage);
        error.statusCode = response.status;
        throw error;
      }

      const outputText = extractResponseText(payload);
      if (!outputText) {
        throw new Error('OpenAI returned an empty response');
      }

      const parsed = JSON.parse(outputText);
      const normalizedQuestions = normalizeQuestions(parsed.questions);
      const qualityCheck = validateQuestionSetQuality(normalizedQuestions);

      if (qualityCheck.passed) {
        questions = normalizedQuestions;
        break;
      }

      qualityFailures.push(`attempt ${attempt}: ${qualityCheck.issues.join('; ')}`);
      console.warn(`AI quiz quality retry for ${quizId} (attempt ${attempt})`, qualityCheck.issues);
    }

    if (!questions) {
      throw new Error(`AI quiz quality validation failed: ${qualityFailures.join(' | ')}`);
    }

    aiQuizCache.set(quizId, {
      questions,
      expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
    });

    return questions;
  })();

  aiQuizInflight.set(quizId, requestPromise);

  try {
    return await requestPromise;
  } finally {
    aiQuizInflight.delete(quizId);
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

app.get('/api/leaderboard', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const seasonKey = String(req.query.seasonKey || getCurrentSeasonMeta().seasonKey);

  try {
    const { data, error } = await supabaseAdmin
      .from('leaderboard_entries')
      .select('user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at')
      .eq('season_key', seasonKey)
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return res.json({ entries: data || [] });
  } catch (error) {
    console.error('leaderboard fetch error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
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
      score: Number(entry.score) || 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('leaderboard_entries')
      .upsert(payload, { onConflict: 'user_id' })
      .select('user_id, user_email, display_name, avatar_url, season_key, season_label, season_start_date, season_end_date, xp, streak_count, best_streak, streak_freezers, completed_count, active_review_count, resolved_review_count, ads_disabled, score, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return res.json({ success: true, entry: data });
  } catch (error) {
    console.error('leaderboard sync error', error.message);
    return res.status(500).json({ error: error.message || 'Failed to sync leaderboard' });
  }
});

app.post('/api/quizzes/generate', createRateLimiter({ key: 'quiz-generate', limit: 25, windowMs: 60_000 }), async (req, res) => {
  const { quizId, forceRefresh = false } = req.body || {};

  if (!quizId) {
    return res.status(400).json({ error: 'quizId is required' });
  }

  try {
    const questions = await generateAiQuizQuestions(String(quizId), { forceRefresh: Boolean(forceRefresh) });
    return res.json({
      success: true,
      source: 'openai',
      model: openAiModel,
      questions,
    });
  } catch (error) {
    console.error('quiz generate error', error.message);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'AI quiz generation failed',
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

app.post('/api/payments/kakao/create-checkout', async (req, res) => {
  if (!kakaoAdminKey) return res.status(500).json({ error: 'KAKAO_ADMIN_KEY is not configured' });

  const { cid, partner_order_id, partner_user_id, item_name, quantity, total_amount, tax_free_amount, approval_url, fail_url, cancel_url } = req.body;
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
});
