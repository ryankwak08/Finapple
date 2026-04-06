import { BACKEND_URL } from '@/lib/backendUrl';

const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const memoryCache = new Map();
const inflightRequests = new Map();

const getCacheKey = (quizId) => `finapple:ai-quiz:${quizId}`;

function readCachedQuiz(quizId) {
  const memoryEntry = memoryCache.get(quizId);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry;
  }

  try {
    const raw = window.localStorage.getItem(getCacheKey(quizId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.questions || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(getCacheKey(quizId));
      return null;
    }

    memoryCache.set(quizId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedQuiz(quizId, result) {
  const entry = {
    questions: result.questions,
    source: result.source || 'openai',
    model: result.model || null,
    expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
  };

  memoryCache.set(quizId, entry);

  try {
    window.localStorage.setItem(getCacheKey(quizId), JSON.stringify(entry));
  } catch {
    // Ignore storage errors and keep in-memory cache only.
  }
}

export function clearAiQuizCache(quizId) {
  memoryCache.delete(quizId);
  inflightRequests.delete(quizId);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(getCacheKey(quizId));
  } catch {
    // Ignore storage errors.
  }
}

async function fetchAiQuiz(quizId, options = {}) {
  const { forceRefresh = false } = options;
  const response = await fetch(`${BACKEND_URL}/api/quizzes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quizId, forceRefresh }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'AI quiz generation failed');
  }

  writeCachedQuiz(quizId, result);
  return {
    questions: result.questions,
    source: result.source || 'openai',
    model: result.model || null,
    fromCache: false,
  };
}

export function prefetchAiQuiz(quizId) {
  if (!quizId || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const cached = readCachedQuiz(quizId);
  if (cached) {
    return Promise.resolve(cached.questions);
  }

  const inflight = inflightRequests.get(quizId);
  if (inflight) {
    return inflight;
  }

  const request = fetchAiQuiz(quizId)
    .catch(() => null)
    .finally(() => {
      inflightRequests.delete(quizId);
    });

  inflightRequests.set(quizId, request);
  return request;
}

export async function generateAiQuiz(quizId, options = {}) {
  const { forceRefresh = false } = options;
  const cached = !forceRefresh && typeof window !== 'undefined' ? readCachedQuiz(quizId) : null;
  if (cached) {
    return {
      questions: cached.questions,
      source: cached.source || 'openai',
      model: cached.model || null,
      fromCache: true,
    };
  }

  if (forceRefresh) {
    clearAiQuizCache(quizId);
  }

  const inflight = !forceRefresh ? inflightRequests.get(quizId) : null;
  if (inflight) {
    const result = await inflight;
    if (result) {
      return result;
    }
  }

  const request = fetchAiQuiz(quizId, { forceRefresh }).finally(() => {
    inflightRequests.delete(quizId);
  });

  inflightRequests.set(quizId, request);
  return request;
}
