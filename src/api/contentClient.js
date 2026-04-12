import { BACKEND_URL } from '@/lib/backendUrl';

const contentCache = new Map();
const CONTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const buildCacheKey = (type, locale, payload) => `${type}:${locale}:${JSON.stringify(payload)}`;

function readPersistentCache(cacheKey) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.data || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function writePersistentCache(cacheKey, data) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({
      data,
      expiresAt: Date.now() + CONTENT_CACHE_TTL_MS,
    }));
  } catch {
    // Ignore storage errors and rely on in-memory cache.
  }
}

async function requestTranslation(type, payload, locale = 'ko') {
  const normalizedLocale = String(locale || 'ko').toLowerCase().startsWith('en') ? 'en' : 'ko';
  if (normalizedLocale !== 'en') {
    return payload;
  }

  const cacheKey = buildCacheKey(type, normalizedLocale, payload);
  const cached = contentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const persisted = readPersistentCache(cacheKey);
  if (persisted) {
    return persisted;
  }

  const request = fetch(`${BACKEND_URL}/api/content/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      locale: normalizedLocale,
      payload,
    }),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Content translation failed');
      }

      contentCache.set(cacheKey, result.content);
      writePersistentCache(cacheKey, result.content);
      return result.content;
    });

  contentCache.set(cacheKey, request);
  return request;
}

export function translateLessonChunkContent(lessonChunk, locale = 'ko') {
  return requestTranslation('lessonChunk', lessonChunk, locale);
}

export function translateQuizQuestionsContent(questions, locale = 'ko') {
  return requestTranslation('quizQuestions', { questions }, locale);
}

export function prefetchTranslatedContent(type, payload, locale = 'ko') {
  return requestTranslation(type, payload, locale).catch(() => null);
}

export function readCachedTranslatedContent(type, payload, locale = 'ko') {
  const normalizedLocale = String(locale || 'ko').toLowerCase().startsWith('en') ? 'en' : 'ko';
  if (normalizedLocale !== 'en') {
    return null;
  }

  const cacheKey = buildCacheKey(type, normalizedLocale, payload);
  const memoryValue = contentCache.get(cacheKey);
  if (memoryValue && typeof memoryValue.then !== 'function') {
    return memoryValue;
  }

  return readPersistentCache(cacheKey);
}
