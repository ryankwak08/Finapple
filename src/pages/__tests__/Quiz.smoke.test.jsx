import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Quiz from '../Quiz';

vi.mock('../../lib/useProgress', () => ({
  default: () => ({
    progress: { xp: 240, hearts: 5 },
    loading: false,
    isPremium: false,
    isUnitLocked: vi.fn(() => false),
    isQuizCompleted: vi.fn(() => false),
    getQuizScore: vi.fn(() => null),
  }),
}));

vi.mock('../../components/CourseSelector', () => ({
  default: () => <div>Course Selector</div>,
}));

vi.mock('../../components/quiz/HeartDisplay', () => ({
  default: ({ hearts }) => <div>hearts:{hearts}</div>,
}));

vi.mock('../../components/quiz/QuizRoadmap', () => ({
  default: () => <div>Quiz Roadmap</div>,
}));

describe('Quiz smoke', () => {
  it('renders selected course quiz overview', () => {
    render(
      <MemoryRouter initialEntries={['/quiz?course=youth']}>
        <Routes>
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('청년기 편')).toBeInTheDocument();
    expect(screen.getByText('Quiz Roadmap')).toBeInTheDocument();
    expect(screen.getAllByText('hearts:5')).toHaveLength(1);
  });
});
