const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-4363348750871813';
const ADSENSE_SCRIPT_ID = 'finapple-adsense-script';

const getAdsenseScript = () => (
  document.getElementById(ADSENSE_SCRIPT_ID) ||
  document.querySelector(`script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}"]`)
);

export function syncAdsenseForUser({ enabled }) {
  if (typeof document === 'undefined') {
    return;
  }

  const existingScript = getAdsenseScript();

  if (!enabled) {
    document.getElementById(ADSENSE_SCRIPT_ID)?.remove();
    return;
  }

  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT_ID)}`;
  document.head.appendChild(script);
}
