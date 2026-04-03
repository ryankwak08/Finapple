import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import CourseSelector from '../components/CourseSelector';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';
import QuizRoadmap from '../components/quiz/QuizRoadmap';

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || null;
  });
  const { progress, loading, isPremium, isUnitLocked, isQuizCompleted, getQuizScore } = useProgress();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelectedCourse(params.get('course') || null);
  }, [location.search]);

  useEffect(() => {
    const handleTabReset = (event) => {
      if (event.detail?.tabRoot !== '/quiz') return;
      setSelectedCourse(null);
      window.history.replaceState({}, '', '/quiz');
    };

    window.addEventListener('bottomNavReset', handleTabReset);
    return () => window.removeEventListener('bottomNavReset', handleTabReset);
  }, []);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    window.history.replaceState({}, '', `/quiz?course=${course}`);
  };

  if (!selectedCourse) {
    return <CourseSelector type="quiz" onSelect={handleSelectCourse} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleQuizSelect = (quizId) => {
    if (!isPremium && progress.hearts <= 0) return;
    navigate(`/quiz/${quizId}?course=${selectedCourse}`);
  };

  return (
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedCourse(null)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">청년기 편</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-accent/15 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="text-[13px] font-bold text-accent-foreground">{progress?.xp || 0} XP</span>
          </div>
        </div>
        <p className="text-muted-foreground text-[14px]">
          학습한 내용을 퀴즈로 확인해보세요
        </p>
      </div>

      {/* Hearts status */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-6 flex items-center justify-between animate-slide-up">
        <div>
          <p className="text-[13px] font-semibold text-foreground">오늘의 하트</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isPremium
              ? '프리미엄 혜택으로 하트가 무제한이에요'
              : progress.hearts > 0
              ? '틀리면 하트가 줄어요'
              : '내일 다시 충전돼요 😴'}
          </p>
        </div>
        <HeartDisplay hearts={progress?.hearts || 0} unlimited={isPremium} />
      </div>

      {/* No hearts warning */}
      {!isPremium && progress.hearts <= 0 && (
        <div className="bg-destructive/10 rounded-2xl p-4 mb-6 border border-destructive/20 animate-scale-in">
          <p className="text-[14px] font-bold text-destructive text-center">
            💔 하트를 모두 사용했어요
          </p>
          <p className="text-[12px] text-destructive/70 text-center mt-1">
            내일 자정에 5개로 다시 충전됩니다
          </p>
        </div>
      )}

      {isPremium && (
        <div className="bg-primary/10 rounded-2xl p-4 mb-6 border border-primary/20 animate-scale-in">
          <p className="text-[14px] font-bold text-primary text-center">
            ♾ 프리미엄 무제한 하트
          </p>
          <p className="text-[12px] text-primary/80 text-center mt-1">
            오답이 나와도 하트가 차감되지 않습니다
          </p>
        </div>
      )}

      {/* Roadmap */}
      <QuizRoadmap
        isUnitLocked={isUnitLocked}
        isQuizCompleted={isQuizCompleted}
        getQuizScore={getQuizScore}
        onQuizSelect={handleQuizSelect}
        course={selectedCourse}
      />
    </div>
  );
}
