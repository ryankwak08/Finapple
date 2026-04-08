import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Quiz from '../Quiz';

vi.mock('../../lib/useProgress', () => ({
  default: () => ({
    progress: { xp: 120, hearts: 3 },
    loading: false,
    isPremium: false,
    isUnitLocked: () => false,
    isQuizCompleted: () => false,
    getQuizScore: () => null,
  }),
}));

vi.mock('../../components/quiz/QuizRoadmap', () => ({
  default: () => <div>시사 용어 10개 외우기</div>,
}));

describe('Quiz smoke', () => {
  it('renders quiz tab layout', () => {
    render(
      <MemoryRouter initialEntries={['/quiz?course=youth']}>
        <Routes>
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('청년기 편')).toBeInTheDocument();
    expect(screen.getByText('학습한 내용을 퀴즈로 확인해보세요')).toBeInTheDocument();
    expect(screen.getAllByText('시사 용어 10개 외우기').length).toBeGreaterThan(0);
  });
});
