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

  const origin = window.location.origin.replace(/\/$/, '');
  return /^https?:\/\//i.test(origin) ? origin : '';
};

const PRODUCTION_BACKEND_URL = 'https://finapple-api.onrender.com';

export const BACKEND_URL = (() => {
  const configuredUrl = normalizeUrl(import.meta.env.VITE_BACKEND_URL);
  const browserOrigin = getBrowserOrigin();
  const hasNonHttpBrowserOrigin = typeof window !== 'undefined' && window.location?.origin && !browserOrigin;

  if (hasNonHttpBrowserOrigin) {
    return configuredUrl || PRODUCTION_BACKEND_URL;
  }

  if (import.meta.env.DEV) {
    const localDevUrl = normalizeUrl(import.meta.env.VITE_LOCAL_BACKEND_URL);
    if (localDevUrl) {
      return localDevUrl;
    }

    const useRemoteBackendInDev = String(import.meta.env.VITE_USE_REMOTE_BACKEND_IN_DEV || 'false')
      .toLowerCase()
      .trim() === 'true';

    if (useRemoteBackendInDev) {
      if (configuredUrl) {
        return configuredUrl;
      }
    }

    return 'http://localhost:3000';
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  return browserOrigin || PRODUCTION_BACKEND_URL;
})();
