const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  return `https://${trimmed.replace(/^\/+/, '').replace(/\/$/, '')}`;
};

const getBrowserOrigin = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return '';
  }

  return window.location.origin.replace(/\/$/, '');
};

export const BACKEND_URL = (() => {
  if (import.meta.env.DEV) {
    const localDevUrl = normalizeUrl(import.meta.env.VITE_LOCAL_BACKEND_URL);
    return localDevUrl || 'http://localhost:3000';
  }

  const configuredUrl = normalizeUrl(import.meta.env.VITE_BACKEND_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  return getBrowserOrigin();
})();
