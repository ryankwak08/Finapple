import { BACKEND_URL } from '@/lib/backendUrl';

export async function fetchFinanceChat(payload, locale = 'ko') {
  const response = await fetch(`${BACKEND_URL}/api/finance-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, locale }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Finance chat request failed');
  }

  return data;
}

export async function fetchYouthCoreQuestions(locale = 'ko') {
  const response = await fetch(`${BACKEND_URL}/api/finance-chat/questions?locale=${encodeURIComponent(locale)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load youth core questions');
  }
  return data?.questions || {};
}
