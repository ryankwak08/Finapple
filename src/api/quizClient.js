import { BACKEND_URL } from '@/lib/backendUrl';

const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const memoryCache = new Map();
const inflightRequests = new Map();

const getCacheKey = (quizId, locale = 'ko') => `finapple:ai-quiz:${quizId}:${locale}`;

function readCachedQuiz(quizId, locale = 'ko') {
  const cacheKey = getCacheKey(quizId, locale);
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.questions || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(getCacheKey(quizId));
      return null;
    }

    memoryCache.set(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedQuiz(quizId, locale, result) {
  const cacheKey = getCacheKey(quizId, locale);
  const entry = {
    questions: result.questions,
    source: result.source || 'openai',
    model: result.model || null,
    expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
  };

  memoryCache.set(cacheKey, entry);

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore storage errors and keep in-memory cache only.
  }
}

export function clearAiQuizCache(quizId, locale = 'ko') {
  const cacheKey = getCacheKey(quizId, locale);
  memoryCache.delete(cacheKey);
  inflightRequests.delete(cacheKey);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(cacheKey);
  } catch {
    // Ignore storage errors.
  }
}

async function fetchAiQuiz(quizId, options = {}) {
  const { forceRefresh = false, locale = 'ko' } = options;
  const response = await fetch(`${BACKEND_URL}/api/quizzes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quizId, forceRefresh, locale }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'AI quiz generation failed');
  }

  writeCachedQuiz(quizId, locale, result);
  return {
    questions: result.questions,
    source: result.source || 'openai',
    model: result.model || null,
    locale,
    fromCache: false,
  };
}

export function prefetchAiQuiz(quizId, options = {}) {
  const { locale = 'ko' } = options;
  if (!quizId || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const cacheKey = getCacheKey(quizId, locale);
  const cached = readCachedQuiz(quizId, locale);
  if (cached) {
    return Promise.resolve(cached.questions);
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = fetchAiQuiz(quizId, { locale })
    .catch(() => null)
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, request);
  return request;
}

export async function generateAiQuiz(quizId, options = {}) {
  const { forceRefresh = false, locale = 'ko' } = options;
  const cacheKey = getCacheKey(quizId, locale);
  const cached = !forceRefresh && typeof window !== 'undefined' ? readCachedQuiz(quizId, locale) : null;
  if (cached) {
    return {
      questions: cached.questions,
      source: cached.source || 'openai',
      model: cached.model || null,
      locale,
      fromCache: true,
    };
  }

  if (forceRefresh) {
    clearAiQuizCache(quizId, locale);
  }

  const inflight = !forceRefresh ? inflightRequests.get(cacheKey) : null;
  if (inflight) {
    const result = await inflight;
    if (result) {
      return result;
    }
  }

  const request = fetchAiQuiz(quizId, { forceRefresh, locale }).finally(() => {
    inflightRequests.delete(cacheKey);
  });

  inflightRequests.set(cacheKey, request);
  return request;
}
