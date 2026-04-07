const normalizeAbsoluteUrl = (value) => {
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

export const getAppBaseUrl = () => {
  const configuredBaseUrl = normalizeAbsoluteUrl(import.meta.env.VITE_APP_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return '';
};

export const buildAppUrl = (path = '/') => {
  const baseUrl = getAppBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
