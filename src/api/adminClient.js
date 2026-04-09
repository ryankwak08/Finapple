import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다.');
  }

  return data.session.access_token;
}

async function request(path, body = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      ...body,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || '관리자 요청에 실패했습니다.');
  }

  return result;
}

export async function fetchCurrentUserState() {
  const result = await request('/api/user-state/read');
  return result.state || null;
}

export async function consumeCurrentUserHeart() {
  const result = await request('/api/user-state/consume-heart');

  return result.state || null;
}

export async function findAdminManagedUser(query) {
  const result = await request('/api/admin/user/find', { query });
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

  const result = await request('/api/admin/user', payload);

  return result.user;
}
