import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import CourseSelector from '../components/CourseSelector';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';
import QuizRoadmap from '../components/quiz/QuizRoadmap';
import PremiumBadge from '@/components/PremiumBadge';
import { getCourseMeta } from '@/lib/courseMeta';
import { isAdminUser } from '@/lib/premium';

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || null;
  });
  const { progress, loading, isPremium, isUnitLocked, isQuizCompleted, getQuizScore, user } = useProgress();
  const courseMeta = getCourseMeta(selectedCourse || 'youth');
  const canAccessTeenCourse = isAdminUser(user);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelectedCourse(params.get('course') || null);
  }, [location.search]);

  useEffect(() => {
    if (selectedCourse !== 'teen' || canAccessTeenCourse) {
      return;
    }

    setSelectedCourse(null);
    window.history.replaceState({}, '', '/quiz');
  }, [canAccessTeenCourse, selectedCourse]);

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
    return <CourseSelector type="quiz" onSelect={handleSelectCourse} canAccessTeenCourse={canAccessTeenCourse} />;
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
    <div className="px-4 pb-6 pt-8 sm:px-5 sm:pt-10">
      <div className="mb-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-4">
        <div>
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => setSelectedCourse(null)} className="rounded-xl p-1.5 transition-colors hover:bg-muted">
                <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" />
              </button>
              <h1 className="truncate text-[26px] font-extrabold tracking-tight text-foreground sm:text-3xl">{courseMeta.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[13px] font-bold text-accent-foreground">{progress?.xp || 0} XP</span>
            </div>
          </div>
          <p className="text-muted-foreground text-[14px]">
            학습한 내용을 퀴즈로 확인해보세요
          </p>
          <div className="mt-4 hidden max-w-xl rounded-2xl border border-border bg-card px-4 py-3 lg:block">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
              {courseMeta.sourceLabel}
            </p>
            <a
              href={courseMeta.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              원문 출처 보기
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4 lg:mt-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-primary/80">학습 상태</p>
              {isPremium ? <PremiumBadge compact /> : null}
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[13px] font-semibold text-foreground">오늘의 하트</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isPremium ? '무제한으로 계속 도전할 수 있어요' : '진행 가능한 하트 수를 확인하세요'}
                </p>
              </div>
              <div className="justify-self-start xl:justify-self-end">
                <HeartDisplay hearts={progress?.hearts || 0} unlimited={isPremium} />
              </div>
            </div>
          </div>

        </div>
      </div>

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

      <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 lg:hidden">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {courseMeta.sourceLabel}
        </p>
        <a
          href={courseMeta.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
        >
          원문 출처 보기
        </a>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/60 p-4 sm:p-5 xl:p-6">
        <QuizRoadmap
          isUnitLocked={isUnitLocked}
          isQuizCompleted={isQuizCompleted}
          getQuizScore={getQuizScore}
          onQuizSelect={handleQuizSelect}
          course={selectedCourse}
        />
      </div>
    </div>
  );
}
