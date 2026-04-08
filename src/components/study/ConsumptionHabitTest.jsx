import { useMemo, useState } from 'react';

const TEST_ITEMS = [
  '옷을 사더라도 유행에 맞게 유명브랜드를 사야 한다.',
  '연말 소득공제는 하라는 대로 하고, 환급을 못 받으면 어쩔 수 없다.',
  '고가품을 살 때 구매 계획을 세워 본 적이 없다.',
  '매달 카드대금을 결제하면 돈이 없거나 결제할 돈이 모자란다.',
  '습관적으로 택시를 탄다.',
  '점심값 또는 술값은 거의 내가 내는 편이다.',
  '적금을 들어본 적이 없다.',
  '빚을 내서라도 여름휴가나 겨울철 스키는 반드시 즐긴다.',
  '가계부를 써본 적이 없다.',
  '미래 준비를 목적으로 스스로 저축 계획을 세워본 적이 없다.',
];

const getResult = (yesCount) => {
  if (yesCount >= 7) {
    return {
      label: '소비성향 주의보',
      description: '이대로 계속 간다면 파산할 수 있습니다.',
      toneClass: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (yesCount >= 5) {
    return {
      label: '감정적 소비자',
      description: '한순간에 무너질 수 있으니 조심하세요.',
      toneClass: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (yesCount >= 3) {
    return {
      label: '근검절약 소비자',
      description: '낭비 없는 실속파입니다.',
      toneClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: '뚝심 있는 소비자',
    description: '건강한 부자의 길입니다.',
    toneClass: 'border-primary/20 bg-primary/10 text-primary',
  };
};

export default function ConsumptionHabitTest() {
  const [answers, setAnswers] = useState(() => Array(TEST_ITEMS.length).fill(null));

  const answeredCount = answers.filter((value) => value !== null).length;
  const yesCount = answers.filter(Boolean).length;
  const isComplete = answeredCount === TEST_ITEMS.length;
  const result = useMemo(() => getResult(yesCount), [yesCount]);

  const handleSelect = (index, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleReset = () => {
    setAnswers(Array(TEST_ITEMS.length).fill(null));
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-foreground/80">
        금융감독원 소비습관 테스트(10문항)입니다. 각 문항에 대해 현재 본인에게 가까운 답을 선택해보세요.
      </p>

      <div className="space-y-2">
        {TEST_ITEMS.map((item, index) => (
          <div key={item} className="rounded-xl border border-border bg-muted/25 px-3 py-3">
            <p className="text-[13px] leading-relaxed text-foreground">{index + 1}. {item}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelect(index, true)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  answers[index] === true
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                예
              </button>
              <button
                type="button"
                onClick={() => handleSelect(index, false)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  answers[index] === false
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                아니오
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3">
        <p className="text-[12px] text-muted-foreground">
          진행도 {answeredCount}/{TEST_ITEMS.length} · 예 {yesCount}개
        </p>
        {isComplete ? (
          <div className={`mt-2 rounded-lg border px-3 py-2 ${result.toneClass}`}>
            <p className="text-[13px] font-extrabold">{result.label}</p>
            <p className="mt-1 text-[12px] leading-relaxed">{result.description}</p>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">모든 문항에 답하면 결과가 표시됩니다.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
        >
          다시 하기
        </button>
      </div>
    </div>
  );
}
