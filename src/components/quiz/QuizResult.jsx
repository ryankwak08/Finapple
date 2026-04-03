import { Star, Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuizResult({ score, total, xpEarned, isNewCompletion, hearts, isUnlimitedHearts = false, backUrl = '/quiz' }) {
  const percentage = Math.round((score / total) * 100);
  const passed = score >= 3;
  const stars = score >= 5 ? 3 : score >= 4 ? 2 : score >= 3 ? 1 : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-scale-in">
      {/* Score circle */}
      <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center mb-6 ${
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
      <div className="flex gap-1 mb-3">
        {[1, 2, 3].map(i => (
          <Star key={i} className={`w-7 h-7 ${i <= stars ? 'text-accent fill-accent' : 'text-muted-foreground/20 fill-muted-foreground/10'}`} />
        ))}
      </div>

      {/* Message */}
      <h2 className="text-xl font-extrabold text-foreground text-center mb-2">
        {passed ? '통과! 🎉' : '불합격 😢'}
      </h2>
      <p className="text-muted-foreground text-[14px] text-center mb-1">
        {score}/{total} 정답 ({percentage}%)
      </p>
      <p className="text-[13px] text-center mb-6 font-medium">
        {passed ? '다음 퀴즈로 진행할 수 있어요' : '3개 이상 맞춰야 통과할 수 있어요'}
      </p>

      {/* Stats */}
      <div className="flex gap-6 mb-8">
        {isNewCompletion && (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <span className="text-[14px] font-semibold text-foreground">+{xpEarned} XP</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400 fill-red-400" />
          <span className="text-[14px] font-semibold text-foreground">
            {isUnlimitedHearts ? '무제한' : `${hearts} 남음`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        <Link
          to={backUrl}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          퀴즈 목록으로
        </Link>
      </div>
    </div>
  );
}
