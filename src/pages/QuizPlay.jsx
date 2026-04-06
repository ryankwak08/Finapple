import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Trophy, Star, Sparkles } from 'lucide-react';
import { getQuizById } from '../lib/quizData';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';
import QuestionCard from '../components/quiz/QuestionCard';
import QuizResult from '../components/quiz/QuizResult';
import { generateAiQuiz } from '@/api/quizClient';
import useSoundEffects from '@/hooks/useSoundEffects';
import { getLessonChunkForQuiz } from '@/lib/studyData';

export default function QuizPlay() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const course = new URLSearchParams(window.location.search).get('course') || 'youth';
  const backUrl = `/quiz?course=${course}`;
  const {
    progress,
    isPremium,
    loseHeart,
    recordWrongAnswer,
    completeQuiz,
    isQuizCompleted,
    getReviewNotesForQuiz,
  } = useProgress();
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
  const [hasRequestedQuiz, setHasRequestedQuiz] = useState(false);
  const [quizSource, setQuizSource] = useState(null);
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
    setHasRequestedQuiz(false);
  }, [quizId]);

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
        const generatedQuiz = await generateAiQuiz(quizId, { forceRefresh });
        if (active) {
          setQuestions(generatedQuiz.questions);
          setQuizSource(generatedQuiz);
        }
      } catch (error) {
        console.error('AI quiz generation failed, using local fallback:', error);
        if (active) {
          setQuestions(quizData?.questions || []);
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

    loadQuestions();

    return () => {
      active = false;
    };
  }, [hasRequestedQuiz, lessonChunk, quizData, quizId]);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        window.clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  const quizSourceLabel = quizSource?.source === 'fallback'
    ? '기본 문항 사용 중'
    : quizSource?.fromCache
    ? 'AI 생성 문항 캐시 사용 중'
    : quizSource?.model
    ? `AI 생성 문항 · ${quizSource.model}`
    : quizSource?.source
    ? 'AI 생성 문항'
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
    const passed = finalScore >= 3;
    const isNew = !isQuizCompleted(quizId);
    const xp = (passed && isNew) ? quizData.xpReward : 0;
    setXpEarned(xp);
    if (passed) {
      await completeQuiz(quizId, finalScore, quizData.xpReward);
      await playSuccessSound();
    }
    setIsAdvancing(false);
    setFinished(true);
  };

  if (!quizData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-muted-foreground text-[15px]">퀴즈를 찾을 수 없습니다</p>
        <Link to={backUrl} className="text-primary font-semibold text-[14px] mt-4">돌아가기</Link>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-[13px]">진행 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (lessonChunk && !hasRequestedQuiz) {
    return (
      <div className="min-h-screen px-4 pb-8 pt-8 sm:px-5 sm:pt-10">
        <div className="mb-8 flex items-start justify-between gap-3">
          <button onClick={() => navigate(-1)} className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors outline-none hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <span className="block text-[14px] font-bold text-foreground">{quizData.title}</span>
            {quizSourceLabel ? <span className="mt-1 block text-[10px] text-muted-foreground">{quizSourceLabel}</span> : null}
          </div>
          <div className="shrink-0">
            <HeartDisplay hearts={progress.hearts} unlimited={isPremium} />
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <p className="text-[12px] font-bold text-primary">퀴즈 전에 1분 학습</p>
          </div>
          <h1 className="text-xl font-extrabold leading-snug text-foreground sm:text-2xl">{lessonChunk.title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{lessonChunk.summary}</p>
        </div>

        {lessonChunk.goals?.length ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">이번 퀴즈 전에 잡을 포인트</p>
            <div className="space-y-2">
              {lessonChunk.goals.map((goal) => (
                <div key={goal} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-foreground leading-relaxed">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {lessonChunk.concepts?.length ? (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">핵심 개념</p>
            <div className="space-y-3">
              {lessonChunk.concepts.map((concept) => (
                <div key={concept.term} className="rounded-xl bg-muted/40 px-4 py-3">
                  <p className="text-[13px] font-bold text-foreground">{concept.term}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{concept.definition}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 mb-5">
          {lessonChunk.learningPoints.map((point) => (
            <div key={point.title} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-lg">{point.emoji}</span>
                <h3 className="font-bold text-[14px] text-foreground">{point.title}</h3>
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line">{point.content}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setHasRequestedQuiz(true)}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-[14px] font-bold"
        >
          이 내용으로 바로 퀴즈 풀기
        </button>
      </div>
    );
  }

  const isLastUnit16Quiz = quizId === 'unit16-quiz3';

  if (finished) {
    const isNew = !isQuizCompleted(quizId);
    if (isLastUnit16Quiz && score >= 3 && !showCongrats) {
      setTimeout(() => setShowCongrats(true), 300);
    }
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
            <h1 className="text-3xl font-extrabold text-foreground mb-2">🏆 커리큘럼 완료!</h1>
            <p className="text-lg font-bold text-primary mb-2">KDI 청년기 생애주기 경제교육</p>
            <p className="text-muted-foreground text-[14px] mb-1">16개 유닛을 모두 완주했습니다!</p>
            <p className="text-muted-foreground text-[13px] mb-6">합리적 소비부터 노후 준비까지,<br/>경제 생활의 모든 것을 배웠어요.</p>
            <div className="bg-white dark:bg-card rounded-2xl p-4 mb-6 shadow-sm border border-border">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-foreground text-[14px]">수고하셨습니다!</span>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-muted-foreground text-[12px] text-center">배운 지식을 실생활에 활용해<br/>더 나은 경제생활을 시작해보세요 💪</p>
            </div>
            <Link
              to={backUrl}
              className="block w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold text-center"
            >
              퀴즈 목록으로 돌아가기
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
        <h2 className="text-xl font-extrabold text-foreground mb-2">하트 부족</h2>
        <p className="text-muted-foreground text-[14px] text-center mb-6">
          오늘의 하트를 모두 사용했어요.<br />내일 다시 도전해주세요!
        </p>
        <Link
          to={backUrl}
          className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-bold"
        >
          돌아가기
        </Link>
      </div>
    );
  }

  if (loading || !questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-[13px]">AI가 퀴즈를 생성 중...</p>
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
          <span className="block text-[14px] font-bold text-foreground">{quizData.title}</span>
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
