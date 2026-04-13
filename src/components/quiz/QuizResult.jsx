import { Star, Heart, ArrowLeft, NotebookPen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getQuizPassThreshold, getQuizStarCount } from '@/lib/quizStars';
import { useLanguage } from '@/lib/i18n';

export default function QuizResult({
  score,
  total,
  xpEarned,
  isNewCompletion,
  hearts,
  isUnlimitedHearts = false,
  backUrl = '/quiz',
  canReview = false,
  reviewCount = 0,
}) {
  const { isEnglish } = useLanguage();
  const percentage = Math.round((score / total) * 100);
  const passed = score >= getQuizPassThreshold(total);
  const stars = getQuizStarCount(score, total);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 animate-scale-in sm:px-6">
      {/* Score circle */}
      <div className={`mb-6 flex h-28 w-28 flex-col items-center justify-center rounded-full sm:h-32 sm:w-32 ${
        passed ? 'bg-primary/10' : 'bg-destructive/10'
      }`}>
        <span className={`text-4xl font-extrabold ${
          passed ? 'text-primary' : 'text-destructive'
        }`}>
          {score}
        </span>
        <span className="text-muted-foreground text-[13px] font-medium">/ {total}</span>
      </div>

      {/* Stars */}
      <div className="mb-3 flex gap-1">
        {[1, 2, 3].map(i => (
          <Star key={i} className={`w-7 h-7 ${i <= stars ? 'text-accent fill-accent' : 'text-muted-foreground/20 fill-muted-foreground/10'}`} />
        ))}
      </div>

      {/* Message */}
      <h2 className="text-xl font-extrabold text-foreground text-center mb-2">
        {passed ? (isEnglish ? 'Passed! 🎉' : '통과! 🎉') : (isEnglish ? 'Try again 😢' : '불합격 😢')}
      </h2>
      <p className="text-muted-foreground text-[14px] text-center mb-1">
        {isEnglish ? `${score}/${total} correct (${percentage}%)` : `${score}/${total} 정답 (${percentage}%)`}
      </p>
      <p className="text-[13px] text-center mb-6 font-medium">
        {passed
          ? (isEnglish ? 'You can move on to the next quiz.' : '다음 퀴즈로 진행할 수 있어요')
          : (isEnglish
            ? `You need at least ${getQuizPassThreshold(total)} correct answers to pass.`
            : `${getQuizPassThreshold(total)}개 이상 맞춰야 통과할 수 있어요`)}
      </p>

      {/* Stats */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {isNewCompletion && (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <span className="text-[14px] font-semibold text-foreground">+{xpEarned} XP</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400 fill-red-400" />
          <span className="text-[14px] font-semibold text-foreground">
            {isUnlimitedHearts ? (isEnglish ? 'Unlimited' : '무제한') : (isEnglish ? `${hearts} left` : `${hearts} 남음`)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        {canReview && reviewCount > 0 && (
          <Link
            to="/review-note"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 py-4 text-[15px] font-bold text-primary"
          >
            <NotebookPen className="w-4 h-4" />
            {isEnglish ? 'Review wrong answers' : '오답노트 보기'}
          </Link>
        )}
        <Link
          to={backUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEnglish ? 'Back to quiz list' : '퀴즈 목록으로'}
        </Link>
      </div>
    </div>
  );
}
