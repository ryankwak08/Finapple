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
  onNext,
  showExplanation = true,
  instantMode = false,
  isAdvancing = false,
}) {
  return (
    <div className="animate-slide-up">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
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
        <span className="mb-2 block text-[12px] font-semibold text-primary">
          문제 {questionIndex + 1} / {totalQuestions}
        </span>
        <h3 className="text-[18px] font-bold leading-snug text-foreground sm:text-[20px]">
          {question.question}
        </h3>
        {question.imageUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card p-2">
            <img
              src={question.imageUrl}
              alt={question.imageAlt || '문항 참고 이미지'}
              className="mx-auto h-auto w-full max-w-md rounded-xl"
              loading="lazy"
            />
          </div>
        ) : null}
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
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5 ${optionStyle}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold ${
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
                <span className={`pt-0.5 text-[14px] leading-snug sm:text-[15px] ${
                  isSelected && !showResult ? 'font-semibold text-foreground' : 'text-foreground/80'
                }`}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Button */}
      <div className="mt-6">
        {!confirmed && !instantMode ? (
          <button
            onClick={onConfirm}
            disabled={selectedAnswer === null}
            data-no-click-sound="true"
            className={`w-full rounded-2xl py-4 text-[15px] font-bold transition-all duration-200 ${
              selectedAnswer !== null
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            확인하기
          </button>
        ) : confirmed ? (
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
              {showExplanation && question.explanation && (
                <div className={`px-4 pb-4 text-[13px] leading-relaxed border-t ${
                  isCorrect ? 'border-emerald-200 text-emerald-800/80' : 'border-red-200 text-red-800/80'
                }`}>
                  <p className="font-semibold mt-2 mb-1">📖 해설</p>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
            {instantMode ? (
              <div className="w-full py-4 rounded-2xl text-[15px] font-bold bg-muted text-muted-foreground text-center">
                {isAdvancing ? '다음 문제로 이동 중...' : '이동 준비 중...'}
              </div>
            ) : (
              <button
                onClick={onNext}
                data-no-click-sound="true"
                className="w-full rounded-2xl bg-primary py-4 text-[15px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
              >
                {questionIndex < totalQuestions - 1 ? '다음 문제' : '결과 보기'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
