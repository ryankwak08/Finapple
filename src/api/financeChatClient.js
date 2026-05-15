import { BACKEND_URL } from '@/lib/backendUrl';
import { supabase } from '@/lib/supabase';

export async function fetchFinanceChat(payload, locale = 'ko') {
  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null }));
  const accessToken = sessionData?.session?.access_token || '';
  const response = await fetch(`${BACKEND_URL}/api/finance-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
