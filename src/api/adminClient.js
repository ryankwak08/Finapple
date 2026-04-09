import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다.');
  }

  return data.session.access_token;
}

async function request(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || '관리자 요청에 실패했습니다.');
  }

  return result;
}

export async function fetchCurrentUserState() {
  const result = await request('/api/user-state');
  return result.state || null;
}

export async function consumeCurrentUserHeart() {
  const result = await request('/api/user-state/consume-heart', {
    method: 'POST',
  });

  return result.state || null;
}

export async function findAdminManagedUser(query) {
  const searchParams = new URLSearchParams({ query });
  const result = await request(`/api/admin/user?${searchParams.toString()}`);
  return result.user;
}

export async function updateAdminManagedUser({ userId, hearts, isPremium }) {
  const payload = { userId };
  if (typeof hearts === 'number') {
    payload.hearts = hearts;
  }
  if (typeof isPremium === 'boolean') {
    payload.isPremium = isPremium;
  }

  const result = await request('/api/admin/user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.user;
}
