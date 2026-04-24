import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';
import { buildAppUrl } from '@/lib/appBaseUrl';
import { isNativeAndroidApp, isNativeIOSApp } from '@/lib/runtimePlatform';
import { syncUserProfileRecord } from '@/services/profileService';
import { getIsPremium, getUserRole } from '@/lib/premium';
import { safeStorage } from '@/lib/safeStorage';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const getAuthRedirectUrl = () => buildAppUrl('/login');
const NATIVE_AUTH_CALLBACK_HOST = 'login-callback';

const getNativeAuthRedirectUrl = async () => {
  const { id } = await CapacitorApp.getInfo();
  return `${id}://${NATIVE_AUTH_CALLBACK_HOST}`;
};

const buildNativeAuthError = (params) => {
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code');

  if (!errorDescription && !errorCode) {
    return '';
  }

  return errorDescription || errorCode || '소셜 로그인 중 오류가 발생했습니다.';
};

const applySessionFromRedirectUrl = async (url) => {
  const parsed = new URL(url);
  const queryParams = parsed.searchParams;
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const errorMessage = buildNativeAuthError(queryParams) || buildNativeAuthError(hashParams);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const authCode = queryParams.get('code') || hashParams.get('code');
  if (authCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) throw error;
    return data;
  }

  const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data;
  }

  throw new Error('로그인 결과를 앱으로 전달받지 못했습니다. 다시 시도해주세요.');
};

const waitForNativeOAuthRedirect = async (redirectTo) => new Promise(async (resolve, reject) => {
  let settled = false;
  let appListener;
  let browserListener;
  let timeoutId;

  const finish = async (callback) => {
    if (settled) {
      return;
    }

    settled = true;
    window.clearTimeout(timeoutId);

    try {
      await appListener?.remove?.();
      await browserListener?.remove?.();
    } catch (listenerError) {
      console.error('Native auth listener cleanup failed:', listenerError);
    }

    callback();
  };

  const handleRedirect = async (url) => {
    if (!url?.startsWith(redirectTo)) {
      return;
    }

    try {
      await Browser.close();
    } catch {}

    try {
      const result = await applySessionFromRedirectUrl(url);
      await finish(() => resolve(result));
    } catch (error) {
      await finish(() => reject(error));
    }
  };

  appListener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleRedirect(url);
  });

  browserListener = await Browser.addListener('browserFinished', () => {
    void finish(() => reject(new Error('로그인을 취소했어요.')));
  });

  timeoutId = window.setTimeout(() => {
    void finish(() => reject(new Error('로그인 시간이 초과됐어요. 다시 시도해주세요.')));
  }, 120000);

  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (launch?.url) {
      await handleRedirect(launch.url);
    }
  } catch (launchError) {
    console.error('Failed to inspect launch URL:', launchError);
  }
});

const signInWithNativeOAuthProvider = async (provider) => {
  const redirectTo = await getNativeAuthRedirectUrl();
  const redirectPromise = waitForNativeOAuthRedirect(redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('소셜 로그인 URL을 생성하지 못했습니다.');
  }

  await Browser.open({
    url: data.url,
    presentationStyle: 'fullscreen',
  });

  return redirectPromise;
};

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

export const signInWithOAuthProvider = async (provider) => {
  if (isNativeIOSApp()) {
    return signInWithNativeOAuthProvider(provider);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) throw error;
  return data;
};

const getRequestHeaders = (accessToken) => ({
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

const getCurrentAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다. 다시 로그인해주세요.');
  }

  return data.session.access_token;
};

export const openAppleSubscriptionManagement = () => {
  const manageUrl = 'https://apps.apple.com/account/subscriptions';

  if (typeof window === 'undefined') {
    return false;
  }

  const opened = window.open(manageUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = manageUrl;
  }

  return true;
};

export const openGooglePlaySubscriptionManagement = () => {
  const manageUrl = 'https://play.google.com/store/account/subscriptions';

  if (typeof window === 'undefined') {
    return false;
  }

  const opened = window.open(manageUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = manageUrl;
  }

  return true;
};

export const cancelPremiumSubscription = async (user) => {
  if (isNativeIOSApp()) {
    openAppleSubscriptionManagement();
    return { platform: 'ios', redirected: true };
  }

  if (isNativeAndroidApp()) {
    openGooglePlaySubscriptionManagement();
    return { platform: 'android', redirected: true };
  }

  const provider = String(user?.user_metadata?.premium_provider || user?.premium_provider || '').toLowerCase();
  if (provider !== 'kcp') {
    throw new Error('현재 웹 구독 해지는 NHN KCP 정기구독에만 지원됩니다. 다른 결제는 고객센터로 문의해주세요.');
  }

  const accessToken = await getCurrentAccessToken();
  const response = await fetch(`${BACKEND_URL}/api/payments/kcp/subscriptions/cancel`, {
    method: 'POST',
    headers: getRequestHeaders(accessToken),
    body: JSON.stringify({ accessToken }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || '구독 해지를 완료하지 못했습니다.');
  }

  return { platform: 'web', ...result };
};

export const signUpWithEmail = async (email, password, nickname, agreements = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        nickname: nickname?.trim() || email.split('@')[0],
        agreements,
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
