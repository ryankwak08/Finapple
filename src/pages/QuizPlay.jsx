import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Trophy, Star, Sparkles } from 'lucide-react';
import { getQuizById } from '../lib/quizData';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';
import QuestionCard from '../components/quiz/QuestionCard';
import QuizResult from '../components/quiz/QuizResult';
import ConsumptionHabitTest from '../components/study/ConsumptionHabitTest';
import InvestmentProfileTest from '../components/study/InvestmentProfileTest';
import { generateAiQuiz } from '@/api/quizClient';
import { readCachedTranslatedContent, translateLessonChunkContent, translateQuizQuestionsContent } from '@/api/contentClient';
import useSoundEffects from '@/hooks/useSoundEffects';
import { getLessonChunkForQuiz } from '@/lib/studyData';
import { getCourseMeta } from '@/lib/courseMeta';
import { getLocalizedQuizMeta, getQuizUnitsCatalog } from '@/lib/quizCatalog';
import { isAdminUser } from '@/lib/premium';
import { useLanguage } from '@/lib/i18n';
import { TRACKS, useTrack } from '@/lib/trackContext';

const getFixedCourseByTrack = (activeTrack, canAccessTeenCourse) => {
  if (activeTrack === TRACKS.YOUTH) return canAccessTeenCourse ? 'teen' : 'youth';
  if (activeTrack === TRACKS.START) return 'youth';
  if (activeTrack === TRACKS.ONE) return 'one';
  return null;
};

export default function QuizPlay() {
  const { isEnglish } = useLanguage();
  const { activeTrack } = useTrack();
  const navigate = useNavigate();
  const { quizId } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const skipLesson = searchParams.get('skipLesson') === '1';
  const {
    progress,
    isPremium,
    loseHeart,
    recordWrongAnswer,
    completeQuiz,
    recordQuizActivity,
    isQuizCompleted,
    getReviewNotesForQuiz,
    user,
  } = useProgress();
  const canAccessTeenCourse = isAdminUser(user);
  const fixedCourse = getFixedCourseByTrack(activeTrack, canAccessTeenCourse);
  const requestedCourse = searchParams.get('course');
  const course = fixedCourse || requestedCourse || 'youth';
  const courseMeta = getCourseMeta(course);
  const courseSourceLabel = isEnglish ? courseMeta.sourceLabelEn : courseMeta.sourceLabel;
  const courseUnits = getQuizUnitsCatalog(course);
  const lastUnit = courseUnits[courseUnits.length - 1];
  const lastQuizId = lastUnit?.quizzes?.[lastUnit.quizzes.length - 1]?.id || '';
  const isLastCourseQuiz = quizId === lastQuizId;
  const shouldPreferLocalQuestions = course === 'one';
  const backUrl = fixedCourse ? '/quiz' : `/quiz?course=${course}`;
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [hasRequestedQuiz, setHasRequestedQuiz] = useState(skipLesson);
  const [quizSource, setQuizSource] = useState(null);
  const [showSourceViewer, setShowSourceViewer] = useState(false);
  const [localizedLessonChunk, setLocalizedLessonChunk] = useState(null);
  const [lessonTranslationFailed, setLessonTranslationFailed] = useState(false);
  const [showLessonTranslationError, setShowLessonTranslationError] = useState(false);
  const autoNextTimerRef = useRef(null);
  const { playCorrectSound, playWrongSound, playSuccessSound } = useSoundEffects();

  const quizData = useMemo(
    () => getQuizById(quizId),
    [quizId]
  );
  const lessonChunk = useMemo(
    () => getLessonChunkForQuiz(quizData?.studyTopicId, quizId),
    [quizData?.studyTopicId, quizId]
  );
  const reviewCount = getReviewNotesForQuiz(quizId).length;
  const sourcePdfUrl = lessonChunk?.topic?.pdfUrl || '';
  const isTeenQuiz = String(quizId || '').startsWith('teen-');
  const isReplay = isQuizCompleted(quizId);
  const localizedQuizMeta = getLocalizedQuizMeta(quizId, quizData || {});
  const quizDisplayTitle = isEnglish ? localizedQuizMeta.title || quizData?.title : quizData?.title;
  const cachedLessonChunk = useMemo(
    () => (isEnglish && lessonChunk ? readCachedTranslatedContent('lessonChunk', lessonChunk, 'en') : null),
    [isEnglish, lessonChunk]
  );
  const displayLessonChunk = isEnglish ? (localizedLessonChunk || cachedLessonChunk) : lessonChunk;

  useEffect(() => {
    setQuestions(null);
    setLoading(false);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setConfirmed(false);
    setIsCorrect(false);
    setScore(0);
    setFinished(false);
    setXpEarned(0);
    setShowCongrats(false);
    setIsAdvancing(false);
    setQuizSource(null);
    setHasRequestedQuiz(skipLesson);
    setShowSourceViewer(false);
    setLocalizedLessonChunk(null);
    setLessonTranslationFailed(false);
    setShowLessonTranslationError(false);
  }, [quizId, skipLesson]);

  useEffect(() => {
    let active = true;

    if (!lessonChunk) {
      setLocalizedLessonChunk(null);
      setLessonTranslationFailed(false);
      setShowLessonTranslationError(false);
      return undefined;
    }

    if (!isEnglish) {
      setLocalizedLessonChunk(lessonChunk);
      setLessonTranslationFailed(false);
      setShowLessonTranslationError(false);
      return undefined;
    }

    if (cachedLessonChunk) {
      setLocalizedLessonChunk(cachedLessonChunk);
      setLessonTranslationFailed(false);
      setShowLessonTranslationError(false);
      return undefined;
    }

    setShowLessonTranslationError(false);

    translateLessonChunkContent(lessonChunk, 'en')
      .then((translated) => {
        if (active) {
          setLocalizedLessonChunk({
            ...lessonChunk,
            ...translated,
          });
          setLessonTranslationFailed(false);
          setShowLessonTranslationError(false);
        }
      })
      .catch((error) => {
        console.error('Lesson translation failed:', error);
        if (active) {
          setLocalizedLessonChunk(null);
          setLessonTranslationFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [cachedLessonChunk, isEnglish, lessonChunk]);

  useEffect(() => {
    if (!lessonTranslationFailed) {
      setShowLessonTranslationError(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowLessonTranslationError(true);
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [lessonTranslationFailed]);

  useEffect(() => {
    let active = true;

    if (!quizData) {
      setLoading(false);
      return undefined;
    }

    if (lessonChunk && !hasRequestedQuiz) {
      setLoading(false);
      return undefined;
    }

    const loadQuestions = async (options = {}) => {
      const { forceRefresh = false } = options;
      setLoading(true);

      try {
        if (shouldPreferLocalQuestions) {
          const localQuestions = quizData?.questions || [];
          if (isEnglish && localQuestions.length > 0) {
            try {
              const translatedQuestions = await translateQuizQuestionsContent(localQuestions, 'en');
              if (active) {
                setQuestions(translatedQuestions);
              }
            } catch (translationError) {
              console.error('Local quiz translation failed, using original questions:', translationError);
              if (active) {
                setQuestions(localQuestions);
              }
            }
          } else if (active) {
            setQuestions(localQuestions);
          }

          if (active) {
            setQuizSource({
              source: 'local',
              model: null,
              fromCache: false,
            });
          }
          return;
        }

        const generatedQuiz = await generateAiQuiz(quizId, { forceRefresh, locale: isEnglish ? 'en' : 'ko' });
        if (active) {
          setQuestions(generatedQuiz.questions);
          setQuizSource(generatedQuiz);
        }
      } catch (error) {
        console.error('AI quiz generation failed, using local fallback:', error);
        if (active) {
          const fallbackQuestions = quizData?.questions || [];
          if (isEnglish && fallbackQuestions.length > 0) {
            try {
              const translatedQuestions = await translateQuizQuestionsContent(fallbackQuestions, 'en');
              if (active) {
                setQuestions(translatedQuestions);
              }
            } catch (translationError) {
              console.error('Fallback quiz translation failed, using original questions:', translationError);
              if (active) {
                setQuestions(fallbackQuestions);
              }
            }
          } else {
            setQuestions(fallbackQuestions);
          }
          setQuizSource({
            source: 'fallback',
            model: null,
            fromCache: false,
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadQuestions({ forceRefresh: isReplay });

    return () => {
      active = false;
    };
  }, [hasRequestedQuiz, isEnglish, isReplay, lessonChunk, quizData, quizId, shouldPreferLocalQuestions]);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        window.clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!finished || !isLastCourseQuiz || score < 3 || showCongrats) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowCongrats(true);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [finished, isLastCourseQuiz, score, showCongrats]);

  const quizSourceLabel = quizSource?.source === 'fallback'
    ? (isEnglish ? 'Using built-in fallback questions' : '기본 문항 사용 중')
    : quizSource?.fromCache
    ? (isEnglish ? 'Using cached AI-generated questions' : 'AI 생성 문항 캐시 사용 중')
    : quizSource?.model
    ? (isEnglish ? `AI-generated questions · ${quizSource.model}` : `AI 생성 문항 · ${quizSource.model}`)
    : quizSource?.source
    ? (isEnglish ? 'AI-generated questions' : 'AI 생성 문항')
    : null;

  const advanceToNextStep = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
      setIsCorrect(false);
      setIsAdvancing(false);
      return;
    }

    const finalScore = score;
    await recordQuizActivity();
    const passed = finalScore >= 3;
    const isNew = !isQuizCompleted(quizId);
    const xp = (passed && isNew) ? quizData.xpReward : 0;
    setXpEarned(xp);
    if (passed) {
      await completeQuiz(quizId, finalScore, quizData.xpReward, questions.length);
      await playSuccessSound();
    }
    setIsAdvancing(false);
    setFinished(true);
  };

  if (!quizData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-muted-foreground text-[15px]">{isEnglish ? 'Quiz not found' : '퀴즈를 찾을 수 없습니다'}</p>
        <Link to={backUrl} className="text-primary font-semibold text-[14px] mt-4">{isEnglish ? 'Go back' : '돌아가기'}</Link>
      </div>
    );
  }

  if (isTeenQuiz && !canAccessTeenCourse) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">🚧</div>
        <h2 className="text-xl font-extrabold text-foreground">{isEnglish ? 'The teen track is coming soon' : '청소년기편은 준비 중입니다'}</h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {isEnglish ? 'Right now it is available only for admin test accounts.' : '현재는 관리자 테스트 계정만 접근할 수 있어요.'}
        </p>
        <Link
          to="/quiz"
          className="mt-6 rounded-2xl bg-primary px-6 py-3 text-[14px] font-bold text-primary-foreground"
        >
          {isEnglish ? 'Back to quiz list' : '퀴즈 목록으로 돌아가기'}
        </Link>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-[13px]">{isEnglish ? 'Loading your progress...' : '진행 정보를 불러오는 중...'}</p>
      </div>
    );
  }

  const completedInUnit = (progress?.completed_quizzes || []).filter((completedQuizId) => (
    String(completedQuizId).startsWith(`${quizData.unitId}-`)
  ));
  const unitCapReachedForFree = !isPremium && completedInUnit.length >= 1 && !isQuizCompleted(quizId);

  if (unitCapReachedForFree && hasRequestedQuiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h2 className="text-xl font-extrabold text-foreground">{isEnglish ? 'Free plan limit reached in this unit' : '이 유닛의 무료 이용 한도에 도달했어요'}</h2>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {isEnglish
            ? 'On the free plan, you can complete 1 quiz per unit. Upgrade to Premium to unlock all quizzes in this unit.'
            : '무료 플랜에서는 유닛당 1개 퀴즈만 완료할 수 있어요. 프리미엄으로 업그레이드하면 이 유닛의 모든 퀴즈를 풀 수 있어요.'}
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <Link
            to="/premium"
            className="rounded-2xl bg-primary px-6 py-3 text-[14px] font-bold text-primary-foreground"
          >
            {isEnglish ? 'Go Premium' : '프리미엄 보러가기'}
          </Link>
          <Link
            to={backUrl}
            className="rounded-2xl border border-border bg-card px-6 py-3 text-[14px] font-bold text-foreground"
          >
            {isEnglish ? 'Back to quiz list' : '퀴즈 목록으로 돌아가기'}
          </Link>
        </div>
      </div>
    );
  }

  if (isEnglish && lessonChunk && !hasRequestedQuiz && !displayLessonChunk && !lessonTranslationFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[14px] font-semibold text-foreground">Preparing the lesson in English...</p>
        <p className="text-[12px] text-muted-foreground">This should only take a moment.</p>
      </div>
    );
  }

  if (isEnglish && lessonChunk && !hasRequestedQuiz && lessonTranslationFailed && showLessonTranslationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-2xl">!</div>
        <div>
          <p className="text-[16px] font-bold text-foreground">English lesson text could not be loaded.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Please try again in a moment.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLessonTranslationFailed(false);
            setLocalizedLessonChunk(null);
            setShowLessonTranslationError(false);
          }}
          className="rounded-2xl bg-primary px-5 py-3 text-[14px] font-bold text-primary-foreground"
        >
          Retry English
        </button>
        <Link
          to={backUrl}
          className="text-[13px] font-semibold text-primary"
        >
          Back to quiz list
        </Link>
      </div>
    );
  }

  if (isEnglish && lessonChunk && !hasRequestedQuiz && lessonTranslationFailed && !showLessonTranslationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[14px] font-semibold text-foreground">Preparing the lesson in English...</p>
        <p className="text-[12px] text-muted-foreground">We are retrying the translation.</p>
      </div>
    );
  }

  if (displayLessonChunk && !hasRequestedQuiz) {
    return (
      <div className="min-h-screen px-4 pb-8 pt-8 sm:px-5 sm:pt-10">
        <div className="mb-8 flex items-start justify-between gap-3">
          <button onClick={() => navigate(-1)} className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors outline-none hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <span className="block text-[14px] font-bold text-foreground">{quizDisplayTitle}</span>
            {quizSourceLabel ? <span className="mt-1 block text-[10px] text-muted-foreground">{quizSourceLabel}</span> : null}
          </div>
          <div className="shrink-0">
            <HeartDisplay hearts={progress.hearts} unlimited={isPremium} />
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <p className="text-[12px] font-bold text-primary">{isEnglish ? 'One-minute prep before the quiz' : '퀴즈 전에 1분 학습'}</p>
          </div>
          <h1 className="text-xl font-extrabold leading-snug text-foreground sm:text-2xl">{displayLessonChunk.title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{displayLessonChunk.summary}</p>
        </div>

        {sourcePdfUrl ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                {courseSourceLabel ? (
                  <p className="text-[11px] text-muted-foreground">{courseSourceLabel}</p>
                ) : null}
                <p className="mt-0.5 text-[12px] font-semibold text-foreground">{isEnglish ? 'Original PDF' : '원문 PDF'}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSourceViewer((prev) => !prev)}
                className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
              >
                {showSourceViewer ? (isEnglish ? 'Close source' : '원문 닫기') : (isEnglish ? 'View source' : '원문 보기')}
              </button>
            </div>
            {showSourceViewer ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <iframe
                  src={`${sourcePdfUrl}#view=FitH`}
                  title={`${displayLessonChunk.title} ${isEnglish ? 'original PDF' : '원문 PDF'}`}
                  className="h-[65vh] w-full min-h-[420px]"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {displayLessonChunk.goals?.length ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">{isEnglish ? 'Key points before this quiz' : '이번 퀴즈 전에 잡을 포인트'}</p>
            <div className="space-y-2">
              {displayLessonChunk.goals.map((goal) => (
                <div key={goal} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-foreground leading-relaxed">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {displayLessonChunk.concepts?.length ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">{isEnglish ? 'Core concepts' : '핵심 개념'}</p>
            <div className="space-y-3">
              {displayLessonChunk.concepts.map((concept) => (
                <div key={concept.term} className="rounded-xl bg-muted/40 px-4 py-3">
                  <p className="text-[13px] font-bold text-foreground">{concept.term}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{concept.definition}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 mb-5">
          {displayLessonChunk.learningPoints.map((point) => (
            <div key={point.title} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-lg">{point.emoji}</span>
                <h3 className="font-bold text-[14px] text-foreground">{point.title}</h3>
              </div>
              <div className="px-4 py-3">
                {point.pointType === 'consumption-habit-test' ? (
                  <ConsumptionHabitTest />
                ) : point.pointType === 'investment-profile-test' ? (
                  <InvestmentProfileTest />
                ) : (
                  <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line">{point.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setHasRequestedQuiz(true)}
          disabled={unitCapReachedForFree}
          className="w-full rounded-2xl bg-primary py-3.5 text-[14px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
        >
          {unitCapReachedForFree
            ? (isEnglish ? 'Free plan limit reached in this unit' : '이 유닛의 무료 한도에 도달했어요')
            : (isEnglish ? 'Start the quiz with this lesson' : '이 내용으로 바로 퀴즈 풀기')}
        </button>
        {unitCapReachedForFree ? (
          <div className="mt-2 space-y-2">
            <p className="text-center text-[12px] text-muted-foreground">
              {isEnglish
                ? 'You can still review lessons freely. Upgrade to Premium to solve all quizzes in this unit.'
                : '학습 내용은 계속 자유롭게 볼 수 있어요. 유닛 내 모든 퀴즈를 풀려면 프리미엄이 필요해요.'}
            </p>
            <Link
              to="/premium"
              className="block w-full rounded-2xl border border-border bg-card py-3 text-center text-[14px] font-bold text-foreground"
            >
              {isEnglish ? 'Go Premium' : '프리미엄 보러가기'}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (finished) {
    const isNew = !isQuizCompleted(quizId);
    if (showCongrats) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 flex flex-col items-center justify-center px-6 z-50">
          <div className="text-center max-w-sm">
            <div className="text-7xl mb-4">🎉</div>
            <div className="flex justify-center gap-2 mb-4">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              <Trophy className="w-8 h-8 text-yellow-600" />
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground mb-2">{isEnglish ? '🏆 Curriculum complete!' : '🏆 커리큘럼 완료!'}</h1>
            <p className="text-lg font-bold text-primary mb-2">{isEnglish ? courseMeta.curriculumCompleteTitleEn : courseMeta.curriculumCompleteTitle}</p>
            <p className="text-muted-foreground text-[14px] mb-1">{isEnglish ? `You finished all ${courseUnits.length} units!` : `${courseUnits.length}개 단원을 모두 완주했습니다!`}</p>
            <p className="text-muted-foreground text-[13px] mb-6 whitespace-pre-line">{isEnglish ? courseMeta.curriculumCompleteSummaryEn : courseMeta.curriculumCompleteSummary}</p>
            <div className="bg-white dark:bg-card rounded-2xl p-4 mb-6 shadow-sm border border-border">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-foreground text-[14px]">{isEnglish ? 'Nice work!' : '수고하셨습니다!'}</span>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-muted-foreground text-[12px] text-center whitespace-pre-line">
                {isEnglish
                  ? 'Put what you learned into real life\nand take the next step toward better money habits.\nFinapple is cheering you on! 💪'
                  : '배운 지식을 실생활에 활용해\n더 나은 경제생활을 시작해보세요.\nFinapple이 응원합니다!💪'}
              </p>
            </div>
            <Link
              to={backUrl}
              className="block w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold text-center"
            >
              {isEnglish ? 'Back to quiz list' : '퀴즈 목록으로 돌아가기'}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <QuizResult
        score={score}
        total={questions.length}
        xpEarned={xpEarned}
        isNewCompletion={isNew || xpEarned > 0}
        hearts={progress.hearts}
        isUnlimitedHearts={isPremium}
        backUrl={backUrl}
        canReview={isPremium}
        reviewCount={reviewCount}
      />
    );
  }

  if (!isPremium && progress.hearts <= 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-5xl mb-4">💔</div>
        <h2 className="text-xl font-extrabold text-foreground mb-2">{isEnglish ? 'No hearts left' : '하트 부족'}</h2>
        <p className="text-muted-foreground text-[14px] text-center mb-6 whitespace-pre-line">
          {isEnglish ? 'You used all of today’s hearts.\nCome back tomorrow to try again!' : '오늘의 하트를 모두 사용했어요.\n내일 다시 도전해주세요!'}
        </p>
        <Link
          to={backUrl}
          className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-bold"
        >
          {isEnglish ? 'Go back' : '돌아가기'}
        </Link>
      </div>
    );
  }

  if (loading || !questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-[13px]">{isEnglish ? 'AI is generating your quiz...' : 'AI가 퀴즈를 생성 중...'}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const showPremiumControls = isPremium;
  const effectiveSelectedAnswer = selectedAnswer;

  const registerWrongAnswer = async (answerIndex) => {
    await recordWrongAnswer({
      quizId,
      quizTitle: quizData.title,
      unitId: quizData.unitId,
      unitTitle: quizData.unitTitle,
      question: currentQuestion,
      selectedAnswer: answerIndex,
      questionType: 'quiz',
    });
  };

  const handleConfirm = async () => {
    if (selectedAnswer === null) return;
    const correct = effectiveSelectedAnswer === currentQuestion.answer;
    setIsCorrect(correct);
    setConfirmed(true);

    if (correct) {
      setScore((prev) => prev + 1);
      await playCorrectSound();
    } else {
      await registerWrongAnswer(effectiveSelectedAnswer);
      await loseHeart();
      await playWrongSound();
    }
  };

  const handleInstantSelect = async (answerIndex) => {
    if (confirmed) return;

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.answer;
    setIsCorrect(correct);
    setConfirmed(true);
    setIsAdvancing(true);

    if (correct) {
      setScore((prev) => prev + 1);
      await playCorrectSound();
    } else {
      await registerWrongAnswer(answerIndex);
      await loseHeart();
      await playWrongSound();
    }

    autoNextTimerRef.current = window.setTimeout(() => {
      advanceToNextStep();
    }, 1100);
  };

  const handleNext = async () => {
    await advanceToNextStep();
  };

  return (
    <div className="min-h-screen px-4 pb-8 pt-8 sm:px-5 sm:pt-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-3">
        <button onClick={() => navigate(-1)} className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors outline-none hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <span className="block text-[14px] font-bold text-foreground">{quizDisplayTitle}</span>
          {quizSourceLabel ? <span className="mt-1 block text-[10px] text-muted-foreground">{quizSourceLabel}</span> : null}
        </div>
        <div className="shrink-0">
          <HeartDisplay hearts={progress.hearts} unlimited={isPremium} />
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        questionIndex={currentIndex}
        totalQuestions={questions.length}
        selectedAnswer={effectiveSelectedAnswer}
        confirmed={confirmed}
        isCorrect={isCorrect}
        onSelect={showPremiumControls ? setSelectedAnswer : handleInstantSelect}
        onConfirm={handleConfirm}
        onNext={handleNext}
        showExplanation={showPremiumControls}
        instantMode={!showPremiumControls}
        isAdvancing={isAdvancing}
      />
    </div>
  );
}
