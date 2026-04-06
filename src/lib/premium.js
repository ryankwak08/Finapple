const forcePremium = import.meta.env.VITE_FORCE_PREMIUM === 'true';
const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || 'ryankwak08@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function getIsPremium(user) {
  if (user?.email && adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  return Boolean(user?.user_metadata?.is_premium ?? user?.is_premium ?? false);
}

export function getAdsDisabled(user) {
  return getIsPremium(user);
}
