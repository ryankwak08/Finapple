import { Check, X } from 'lucide-react';

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  confirmed,
  isCorrect,
  onSelect,
  onConfirm,
  onNext
}) {
  return (
    <div className="animate-slide-up">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < questionIndex
                ? 'bg-primary'
                : i === questionIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-6">
        <span className="text-[12px] font-semibold text-primary mb-2 block">
          문제 {questionIndex + 1} / {totalQuestions}
        </span>
        <h3 className="text-[17px] font-bold text-foreground leading-snug">
          {question.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, oi) => {
          const isSelected = selectedAnswer === oi;
          const isCorrectOption = oi === question.answer;
          const showResult = confirmed;

          let optionStyle = 'bg-card border-border hover:border-primary/30 active:scale-[0.98]';
          if (isSelected && !showResult) {
            optionStyle = 'bg-primary/5 border-primary ring-2 ring-primary/20';
          }
          if (showResult && isCorrectOption) {
            optionStyle = 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200';
          }
          if (showResult && isSelected && !isCorrect) {
            optionStyle = 'bg-red-50 border-red-300 ring-2 ring-red-200';
          }

          return (
            <button
              key={oi}
              onClick={() => !confirmed && onSelect(oi)}
              disabled={confirmed}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${optionStyle}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[12px] font-bold ${
                showResult && isCorrectOption
                  ? 'bg-emerald-100 text-emerald-700'
                  : showResult && isSelected && !isCorrect
                    ? 'bg-red-100 text-red-700'
                    : isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
              }`}>
                {showResult && isCorrectOption ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : showResult && isSelected && !isCorrect ? (
                  <X className="w-4 h-4" strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + oi)
                )}
              </div>
              <span className={`text-[14px] text-left leading-snug ${
                isSelected && !showResult ? 'font-semibold text-foreground' : 'text-foreground/80'
              }`}>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="mt-6">
        {!confirmed ? (
          <button
            onClick={onConfirm}
            disabled={selectedAnswer === null}
            className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all duration-200 ${
              selectedAnswer !== null
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            확인하기
          </button>
        ) : (
          <div>
            <div className={`rounded-xl mb-3 overflow-hidden ${
              isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`px-4 py-3 flex items-center gap-2 ${
                isCorrect ? 'text-emerald-700' : 'text-red-700'
              }`}>
                <span className="text-[14px] font-bold">
                  {isCorrect ? '🎉 정답입니다!' : '😢 틀렸어요'}
                </span>
              </div>
              {question.explanation && (
                <div className={`px-4 pb-4 text-[13px] leading-relaxed border-t ${
                  isCorrect ? 'border-emerald-200 text-emerald-800/80' : 'border-red-200 text-red-800/80'
                }`}>
                  <p className="font-semibold mt-2 mb-1">📖 해설</p>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
            <button
              onClick={onNext}
              className="w-full py-4 rounded-2xl text-[15px] font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200"
            >
              {questionIndex < totalQuestions - 1 ? '다음 문제' : '결과 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}