import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from '../Login';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

vi.mock('@/services/authService', () => ({
  initializePasswordRecovery: vi.fn().mockResolvedValue(false),
  signInWithEmail: vi.fn(),
  signInWithOAuthProvider: vi.fn(),
  signUpWithEmail: vi.fn(),
  resendSignupConfirmation: vi.fn(),
  verifySignupEmailOtp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
  findMaskedEmailByNickname: vi.fn(),
}));

vi.mock('@/services/profileService', () => ({
  isNicknameAvailable: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    checkAppState: vi.fn(),
    isAuthenticated: false,
    authError: null,
    user: null,
  }),
}));

describe('Login smoke', () => {
  it('renders sign-in screen and can switch to sign-up mode', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Finapple에 오신 것을\s*환영합니다/ })).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByLabelText('닉네임', {}, { timeout: 10000 })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '회원가입하기' })).toBeInTheDocument();
  }, 15000);
});
