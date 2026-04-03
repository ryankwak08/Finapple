export function getIsPremium(user) {
  return Boolean(user?.user_metadata?.is_premium ?? user?.is_premium ?? false);
}
