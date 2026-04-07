import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Study from '../Study';

vi.mock('../../lib/useProgress', () => ({
  default: () => ({
    progress: { xp: 120 },
    loading: false,
    user: {
      email: 'tester@example.com',
      user_metadata: { nickname: '테스터' },
    },
    isPremium: false,
    getStreakStatus: () => ({
      streakCount: 3,
      bestStreak: 5,
      streakFreezers: 0,
      freezerShieldActive: false,
      freezerActivatedAt: null,
      freezerExpiresAt: null,
      freezerHistory: [],
    }),
    activateStreakFreezer: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSoundEffects', () => ({
  default: () => ({
    playSuccessSound: vi.fn(),
  }),
}));

vi.mock('../../components/PullToRefresh', () => ({
  default: ({ children }) => children,
}));

describe('Study smoke', () => {
  it('renders the study landing screen with topic cards', () => {
    render(
      <MemoryRouter>
        <Study />
      </MemoryRouter>
    );

    expect(screen.getByText('금융 상식 쌓기')).toBeInTheDocument();
    expect(screen.getByText('청년·신혼부부를 위한 2026 주거지원 정책')).toBeInTheDocument();
    expect(screen.getByText('대학생·취업준비생이 꼭 챙겨야 할 2026 청년정책')).toBeInTheDocument();
    expect(screen.getByText('지금 보는 세계 이슈')).toBeInTheDocument();
    expect(screen.getByText('테스터')).toBeInTheDocument();
  });
});
