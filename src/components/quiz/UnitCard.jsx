import { Lock, Check, ChevronRight, Star } from 'lucide-react';

export default function UnitCard({ unit, locked, quizStatuses, onQuizSelect, index }) {
  const completedCount = quizStatuses.filter(s => s.completed).length;
  const totalQuizzes = unit.quizzes.length;
  const allDone = completedCount === totalQuizzes;
  // Stars: 1 per passed quiz (passed = score >= 3 out of 5)
  const earnedStars = quizStatuses.filter(s => s.completed && s.score !== null && s.score >= 3).length;

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        locked
          ? 'bg-muted/50 border-border opacity-70'
          : allDone
            ? 'bg-primary/5 border-primary/20 shadow-sm'
            : 'bg-card border-border'
      }`}>
        {/* Unit Header */}
        <div className="p-4 pb-3 sm:p-5">
          <div className="flex items-start gap-3">
            <div className={`text-2xl ${locked ? 'grayscale opacity-50' : ''}`}>
              {unit.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-[15px] text-foreground">{unit.title}</h3>
                {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= earnedStars ? 'text-accent fill-accent' : 'text-muted-foreground/20 fill-muted-foreground/10'}`} />
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground text-[12px] mt-0.5">{unit.subtitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[12px] font-medium text-primary">
                {completedCount}/{totalQuizzes}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalQuizzes) * 100}%` }}
            />
          </div>
        </div>

        {/* Quiz list */}
        <div className="px-3 pb-3">
          {unit.quizzes.map((quiz, qi) => {
            const status = quizStatuses[qi];
            return (
              <button
                key={quiz.id}
                onClick={() => {
                  if (locked) return;
                  onQuizSelect(quiz.id);
                }}
                disabled={locked}
                className={`w-full rounded-xl px-3 py-3 transition-all duration-200 ${
                  locked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-secondary active:scale-[0.98] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    status.completed
                      ? 'bg-primary/10'
                      : 'bg-muted'
                  }`}>
                    {status.completed ? (
                      <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
                    ) : (
                      <span className="text-[12px] font-semibold text-muted-foreground">{qi + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-medium text-[13px] text-foreground">{quiz.title}</p>
                    <p className="text-[11px] text-muted-foreground">{quiz.subtitle}</p>
                  </div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2 pl-3">
                  {status.score !== null && (
                    <span className="text-[12px] font-semibold text-primary">{status.score}/5</span>
                  )}
                  {!locked && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
