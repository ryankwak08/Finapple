import { describe, expect, it, vi } from 'vitest';

describe('appBaseUrl', () => {
  it('uses configured app base url when present', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_APP_BASE_URL', 'm.finapple.xyz');
    const { buildAppUrl } = await import('../appBaseUrl.js');

    expect(buildAppUrl('/login')).toBe('https://m.finapple.xyz/login');
  });

  it('falls back to window origin when env is absent', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_APP_BASE_URL', '');
    const { buildAppUrl } = await import('../appBaseUrl.js');
    expect(buildAppUrl('/premium/success')).toBe(`${window.location.origin}/premium/success`);
  });
});
