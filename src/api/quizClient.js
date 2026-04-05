const BACKEND_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const memoryCache = new Map();
const inflightRequests = new Map();

const getCacheKey = (quizId) => `finapple:ai-quiz:${quizId}`;

function readCachedQuiz(quizId) {
  const memoryEntry = memoryCache.get(quizId);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.questions;
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
    return parsed.questions;
  } catch {
    return null;
  }
}

function writeCachedQuiz(quizId, questions) {
  const entry = {
    questions,
    expiresAt: Date.now() + QUIZ_CACHE_TTL_MS,
  };

  memoryCache.set(quizId, entry);

  try {
    window.localStorage.setItem(getCacheKey(quizId), JSON.stringify(entry));
  } catch {
    // Ignore storage errors and keep in-memory cache only.
  }
}

async function fetchAiQuiz(quizId) {
  const response = await fetch(`${BACKEND_URL}/api/quizzes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quizId }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || 'AI quiz generation failed');
  }

  writeCachedQuiz(quizId, result.questions);
  return result.questions;
}

export function prefetchAiQuiz(quizId) {
  if (!quizId || typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const cached = readCachedQuiz(quizId);
  if (cached) {
    return Promise.resolve(cached);
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

export async function generateAiQuiz(quizId) {
  const cached = typeof window !== 'undefined' ? readCachedQuiz(quizId) : null;
  if (cached) {
    return cached;
  }

  const inflight = inflightRequests.get(quizId);
  if (inflight) {
    const result = await inflight;
    if (result) {
      return result;
    }
  }

  const request = fetchAiQuiz(quizId).finally(() => {
    inflightRequests.delete(quizId);
  });

  inflightRequests.set(quizId, request);
  return request;
}
