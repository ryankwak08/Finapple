import { isFreePremiumAccessEnabled } from '@/lib/runtimePlatform';

const forcePremium = import.meta.env.VITE_FORCE_PREMIUM === 'true';
const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || 'ryankwak08@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminUser(user) {
  const role = user?.user_metadata?.role || user?.role;
  if (role === 'admin') {
    return true;
  }

  return Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()));
}

export function getUserRole(user) {
  if (isAdminUser(user)) {
    return 'admin';
  }

  return user?.user_metadata?.role || user?.role || 'user';
}

export function getIsPremium(user) {
  if (isFreePremiumAccessEnabled()) {
    return true;
  }

  if (isAdminUser(user)) {
    return true;
  }

  const premiumFlag = Boolean(user?.user_metadata?.is_premium ?? user?.is_premium ?? false);
  const expiresAt = user?.user_metadata?.premium_expires_at || user?.premium_expires_at;

  if (!premiumFlag) {
    return false;
  }

  if (expiresAt && Number.isFinite(Date.parse(expiresAt))) {
    return Date.parse(expiresAt) > Date.now();
  }

  return true;
}

export function getIsFreeTrialPremium(user) {
  const metadata = user?.user_metadata || {};
  const provider = String(metadata.premium_provider || user?.premium_provider || '').toLowerCase();
  const plan = String(metadata.premium_plan || user?.premium_plan || '').toLowerCase();
  return provider === 'free-trial' || plan === 'free_trial';
}

export function getAdsDisabled(user) {
  return getIsPremium(user);
}
