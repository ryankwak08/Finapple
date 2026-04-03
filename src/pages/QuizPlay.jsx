import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy, Star, Sparkles } from 'lucide-react';
import { getQuizById, getUnitById } from '../lib/quizData';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';
import QuestionCard from '../components/quiz/QuestionCard';
import QuizResult from '../components/quiz/QuizResult';

export default function QuizPlay() {
  const navigate = useNavigate();
  const { quizId } = useParams();
  const course = new URLSearchParams(window.location.search).get('course') || 'youth';
  const backUrl = `/quiz?course=${course}`;
  const { progress, isPremium, loseHeart, completeQuiz, isQuizCompleted } = useProgress();
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

  const quizData = getQuizById(quizId);

  useEffect(() => {
    if (!quizData) { setLoading(false); return; }
    generateQuestions();
  }, [quizId]);

  const generateQuestions = async () => {
    setLoading(true);
    const unit = quizData ? getUnitById(quizData.unitId) : null;
    const topicName = unit ? `${unit.title} - ${quizData.subtitle}` : quizData?.title || '금융 교육';
    try {
      // 로컬 퀴즈 데이터로 문제를 생성합니다.
      // 향후 OpenAI / KoGPT 등과 연동하세요.
      try {
        if (quizData?.questions?.length > 0) {
          setQuestions(quizData.questions);
        } else {
          setQuestions([]);
        }
      } catch (e) {
        setQuestions([]);
      }
    } catch (e) {
      setQuestions(quizData.questions);
    }
    setLoading(false);
  };

  if (!quizData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-muted-foreground text-[15px]">퀴즈를 찾을 수 없습니다</p>
        <Link to={backUrl} className="text-primary font-semibold text-[14px] mt-4">돌아가기</Link>
      </div>
    );
  }

  if (loading || !progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-[13px]">AI가 새로운 문제를 생성 중...</p>
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

  const currentQuestion = questions[currentIndex];

  const handleConfirm = async () => {
    if (selectedAnswer === null) return;
    const correct = selectedAnswer === currentQuestion.answer;
    setIsCorrect(correct);
    setConfirmed(true);

    if (correct) {
      setScore(prev => prev + 1);
    } else {
      await loseHeart();
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
      setIsCorrect(false);
    } else {
      // Quiz finished — score state is already updated by handleConfirm
      const finalScore = score;
      const passed = finalScore >= 3;
      const isNew = !isQuizCompleted(quizId);
      const xp = (passed && isNew) ? quizData.xpReward : 0;
      setXpEarned(xp);
      if (passed) {
        await completeQuiz(quizId, finalScore, quizData.xpReward);
      }
      setFinished(true);
    }
  };

  return (
    <div className="px-5 pt-14 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors outline-none">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] font-bold text-foreground">{quizData.title}</span>
        <HeartDisplay hearts={progress.hearts} unlimited={isPremium} />
      </div>

      <QuestionCard
        question={currentQuestion}
        questionIndex={currentIndex}
        totalQuestions={questions.length}
        selectedAnswer={selectedAnswer}
        confirmed={confirmed}
        isCorrect={isCorrect}
        onSelect={setSelectedAnswer}
        onConfirm={handleConfirm}
        onNext={handleNext}
      />
    </div>
  );
}
