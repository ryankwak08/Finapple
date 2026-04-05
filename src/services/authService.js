import { supabase } from '@/lib/supabase';

const getAuthRedirectUrl = () => {
  const rawBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
  const normalizedBaseUrl = /^https?:\/\//.test(rawBaseUrl)
    ? rawBaseUrl
    : `https://${rawBaseUrl}`;

  return `${normalizedBaseUrl.replace(/\/$/, '')}/login`;
};

const BACKEND_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email, password, nickname) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        nickname: nickname?.trim() || email.split('@')[0],
      },
    },
  });
  if (error) throw error;
  return data;
};

export const resendSignupConfirmation = async (email) => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
  if (error) throw error;
};

export const verifySignupEmailOtp = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  if (error) throw error;
  return data;
};

export const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectUrl()}?mode=reset-password`,
  });
  if (error) throw error;
};

export const updatePassword = async (password) => {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
};

export const findMaskedEmailByNickname = async (nickname) => {
  const response = await fetch(`${BACKEND_URL}/api/account/find-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || '아이디를 찾지 못했습니다.');
  }

  return result.maskedEmail;
};

export const deleteAccount = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다.');
  }

  const response = await fetch(`${BACKEND_URL}/api/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: data.session.access_token,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || '계정을 삭제하지 못했습니다.');
  }

  await supabase.auth.signOut();
  localStorage.removeItem('finapple_progress');
  localStorage.removeItem('totalUsageSeconds');
};

export const updateUserProfile = async (updates) => {
  const { data, error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw error;
  return data.user;
};

export const setPremiumStatus = async (isPremium) => {
  return updateUserProfile({ is_premium: isPremium });
};
