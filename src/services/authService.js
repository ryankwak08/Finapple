import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';
import { buildAppUrl } from '@/lib/appBaseUrl';
import { syncUserProfileRecord } from '@/services/profileService';
import { getIsPremium, getUserRole } from '@/lib/premium';
import { safeStorage } from '@/lib/safeStorage';

const getAuthRedirectUrl = () => buildAppUrl('/login');

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const currentUser = data?.session?.user;

  if (!currentUser) {
    return null;
  }

  return {
    ...currentUser,
    role: getUserRole(currentUser),
    is_premium: getIsPremium(currentUser),
  };
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

export const initializePasswordRecovery = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const recoveryType = hashParams.get('type') || searchParams.get('type');
  const authCode = searchParams.get('code');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (recoveryType !== 'recovery' && !authCode && !accessToken) {
    return false;
  }

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }

  const cleanSearchParams = new URLSearchParams(window.location.search);
  cleanSearchParams.delete('code');
  cleanSearchParams.delete('type');
  cleanSearchParams.set('mode', 'reset-password');
  const nextSearch = cleanSearchParams.toString();
  window.history.replaceState({}, '', `/login${nextSearch ? `?${nextSearch}` : ''}`);

  return true;
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
  safeStorage.removeItem('finapple_progress');
  safeStorage.removeItem('totalUsageSeconds');
};

export const updateUserProfile = async (updates) => {
  const { data, error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw error;
  return data.user;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
  image.src = src;
});

const resizeProfileImage = async (file) => {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있어요.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('프로필 이미지는 5MB 이하만 업로드할 수 있어요.');
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('이미지 처리를 시작하지 못했습니다.');
  }

  const scale = Math.max(size / image.width, size / image.height);
  const targetWidth = image.width * scale;
  const targetHeight = image.height * scale;
  const offsetX = (size - targetWidth) / 2;
  const offsetY = (size - targetHeight) / 2;

  context.clearRect(0, 0, size, size);
  context.drawImage(image, offsetX, offsetY, targetWidth, targetHeight);

  const optimized = canvas.toDataURL('image/webp', 0.82);
  if (optimized.length > 450_000) {
    return canvas.toDataURL('image/jpeg', 0.78);
  }

  return optimized;
};

export const uploadProfilePicture = async (file) => {
  const profilePicture = await resizeProfileImage(file);
  const updatedUser = await updateUserProfile({ profile_picture: profilePicture });
  await syncUserProfileRecord(updatedUser);
  return updatedUser;
};

export const setPremiumStatus = async (isPremium) => {
  return updateUserProfile({ is_premium: isPremium });
};
