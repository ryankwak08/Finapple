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

  return Boolean(user?.user_metadata?.is_premium ?? user?.is_premium ?? false);
}

export function getAdsDisabled(user) {
  return getIsPremium(user);
}
