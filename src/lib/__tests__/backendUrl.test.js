import { afterEach, describe, expect, it, vi } from 'vitest';

describe('BACKEND_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('uses the Vite same-origin proxy by default in development', async () => {
    const { BACKEND_URL } = await import('../backendUrl.js');

    expect(BACKEND_URL).toBe('');
  });

  it('uses configured local backend url in development', async () => {
    vi.stubEnv('VITE_LOCAL_BACKEND_URL', 'http://127.0.0.1:3000');

    const { BACKEND_URL } = await import('../backendUrl.js');

    expect(BACKEND_URL).toBe('http://127.0.0.1:3000');
  });

  it('does not use native app origins as the backend url', async () => {
    vi.stubEnv('VITE_BACKEND_URL', 'finapple-api.onrender.com');
    vi.stubGlobal('window', {
      location: {
        origin: 'capacitor://localhost',
      },
    });

    const { BACKEND_URL } = await import('../backendUrl.js');

    expect(BACKEND_URL).toBe('https://finapple-api.onrender.com');
  });
});
