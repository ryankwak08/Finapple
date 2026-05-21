import { BACKEND_URL, PRODUCTION_BACKEND_URL } from '@/lib/backendUrl';
import { supabase } from '@/lib/supabase';

const FINANCE_CHAT_TIMEOUT_MS = 12000;

const getBackendCandidates = () => {
  const urls = [BACKEND_URL];
  if (BACKEND_URL !== PRODUCTION_BACKEND_URL) {
    urls.push(PRODUCTION_BACKEND_URL);
  }
  return urls;
};

async function fetchJsonWithFallback(path, options = {}) {
  const candidates = getBackendCandidates();
  let lastError = null;

  for (const baseUrl of candidates) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? globalThis.setTimeout(() => controller.abort(), FINANCE_CHAT_TIMEOUT_MS)
      : null;

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        signal: controller?.signal,
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } catch (error) {
      lastError = error;
    } finally {
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new Error('CHATBOT_TIMEOUT');
  }

  throw new Error('CHATBOT_CONNECTION_FAILED');
}

export async function fetchFinanceChat(payload, locale = 'ko') {
  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const accessToken = sessionData?.session?.access_token || '';
  const { response, data } = await fetchJsonWithFallback('/api/finance-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ ...payload, locale }),
  });

  if (!response.ok) {
    throw new Error(data?.error || 'Finance chat request failed');
  }

  return data;
}

export async function fetchYouthCoreQuestions(locale = 'ko') {
  const { response, data } = await fetchJsonWithFallback(`/api/finance-chat/questions?locale=${encodeURIComponent(locale)}`);
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load youth core questions');
  }
  return data?.questions || {};
}
