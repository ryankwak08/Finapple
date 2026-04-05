import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, NotebookPen, RotateCcw, CheckCircle2 } from 'lucide-react';
import PremiumBadge from '@/components/PremiumBadge';
import useProgress from '@/lib/useProgress';
import QuestionCard from '@/components/quiz/QuestionCard';

export default function ReviewNote() {
  const navigate = useNavigate();
  const { reviewId } = useParams();
  const { isPremium, getWrongReviewNotes, getResolvedReviewNotes, resolveWrongAnswer } = useProgress();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [resolvedNote, setResolvedNote] = useState(null);

  const wrongNotes = getWrongReviewNotes();
  const resolvedNotes = getResolvedReviewNotes();
  const activeNote = useMemo(() => wrongNotes.find((entry) => entry.id === reviewId) || null, [reviewId, wrongNotes]);
  const reviewTarget = activeNote || resolvedNote;

  useEffect(() => {
    if (!completed) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/review-note', { replace: true });
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completed, navigate]);

  if (!isPremium) {
    return (
      <div className="min-h-screen px-5 pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] font-medium mb-5 transition-colors outline-none">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="rounded-3xl border border-primary/15 bg-primary/5 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">오답노트는 프리미엄 기능이에요</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            틀린 문제를 저장하고 다시 풀기, 해설 확인, 진도 추적은 프리미엄에서 사용할 수 있어요.
          </p>
          <Link
            to="/premium"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-[14px] font-bold text-primary-foreground"
          >
            프리미엄 보러 가기
          </Link>
        </div>
      </div>
    );
  }

  if (reviewId && reviewTarget) {
    if (completed) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 transition-all duration-500">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">오답을 해결했어요</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            이 문제는 오답노트에서 제거됐고 곧 목록으로 돌아갑니다.
          </p>
        </div>
      );
    }

    const handleConfirm = async () => {
      if (selectedAnswer === null) return;
      const correct = selectedAnswer === activeNote.question.answer;
      setIsCorrect(correct);
      setConfirmed(true);

      if (correct) {
        setResolvedNote(activeNote);
        setCompleted(true);
        await resolveWrongAnswer(activeNote.id);
      }
    };

    return (
      <div className="px-5 pt-14 pb-8 min-h-screen">
        <button onClick={() => navigate('/review-note')} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] font-medium mb-5 transition-colors outline-none">
          <ArrowLeft className="w-4 h-4" />
          오답노트
        </button>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-primary">다시 풀기</p>
            <h1 className="text-lg font-extrabold text-foreground">{reviewTarget.quizTitle}</h1>
          </div>
          <PremiumBadge compact />
        </div>

        <QuestionCard
          question={reviewTarget.question}
          questionIndex={0}
          totalQuestions={1}
          selectedAnswer={selectedAnswer}
          confirmed={confirmed}
          isCorrect={isCorrect}
          onSelect={setSelectedAnswer}
          onConfirm={handleConfirm}
          onNext={() => navigate('/review-note')}
          showExplanation
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] font-medium mb-5 transition-colors outline-none">
        <ArrowLeft className="w-4 h-4" />
        뒤로
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground">오답노트</h1>
            <PremiumBadge compact />
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">틀린 문제를 다시 풀고 이해도를 높여보세요.</p>
        </div>
      </div>

      {wrongNotes.length === 0 && resolvedNotes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <NotebookPen className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground">저장된 오답이 없어요</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            퀴즈를 풀다가 틀린 문제가 생기면 여기에 자동으로 쌓입니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-foreground">틀린 문제</h2>
              <span className="text-[12px] text-muted-foreground">{wrongNotes.length}개</span>
            </div>
            {wrongNotes.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
                지금 다시 풀어야 할 오답은 없어요.
              </div>
            ) : (
              <div className="space-y-3">
                {wrongNotes.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/review-note/${entry.id}`}
                    className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-primary">{entry.unitTitle}</p>
                        <h3 className="text-[15px] font-bold text-foreground mt-1">{entry.quizTitle}</h3>
                        <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2">{entry.question.question}</p>
                      </div>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <RotateCcw className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      다시 풀어 맞히면 해결된 문제로 이동합니다.
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-foreground">다시 풀어 맞춘 문제</h2>
              <span className="text-[12px] text-muted-foreground">{resolvedNotes.length}개</span>
            </div>
            {resolvedNotes.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-[13px] text-muted-foreground">
                아직 해결한 오답은 없어요.
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedNotes.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-emerald-700">{entry.unitTitle}</p>
                        <h3 className="text-[15px] font-bold text-foreground mt-1">{entry.quizTitle}</h3>
                        <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2">{entry.question.question}</p>
                      </div>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] text-emerald-700">
                      다시 풀어 맞춘 문제예요.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
