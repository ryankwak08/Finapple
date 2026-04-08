/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_APP_BASE_URL?: string;
  readonly VITE_KAKAO_CID: string;
  readonly VITE_FORCE_PREMIUM?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_REVENUECAT_APPLE_API_KEY?: string;
  readonly VITE_REVENUECAT_ENTITLEMENT_ID?: string;
  readonly VITE_REVENUECAT_OFFERING_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
