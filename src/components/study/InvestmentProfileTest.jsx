import { useMemo, useState } from 'react';

const QUESTIONS = [
  {
    id: 'age',
    label: '당신의 나이는?',
    options: [
      { label: '29세 이하', score: 8 },
      { label: '30세 이상', score: 6 },
      { label: '40세 이상', score: 5 },
      { label: '50세 이상', score: 3 },
    ],
  },
  {
    id: 'income',
    label: '당신의 소득을 가장 잘 나타내는 것은?',
    options: [
      { label: '정기 소득이 있고, 향후 유지 또는 증가 예상', score: 17 },
      { label: '정기 소득이 있으나, 향후 감소 또는 불안정 예상', score: 10 },
      { label: '일시적으로 소득이 발생하고 있음', score: 5 },
      { label: '현재 소득이 없음', score: 3 },
    ],
  },
  {
    id: 'knowledge',
    label: '금융상품 투자에 대한 본인의 지식수준은?',
    options: [
      { label: '모든 투자상품의 차이를 이해할 수 있다', score: 18 },
      { label: '대부분 금융상품의 차이를 구별할 수 있다', score: 13 },
      { label: '주식과 채권의 차이를 구별할 수 있다', score: 8 },
      { label: '예·적금에 대해서만 안다', score: 3 },
    ],
  },
  {
    id: 'experience',
    label: '당신의 투자경험과 가장 가까운 것은?',
    options: [
      { label: '은행 예·적금', score: 3 },
      { label: '채권형펀드처럼 신용도 높은 회사채', score: 8 },
      { label: '시장수익률 수준의 주식형펀드', score: 14 },
      { label: '고수익을 추구하는 파생상품펀드', score: 17 },
    ],
  },
  {
    id: 'period',
    label: '투자하고자 하는 자금의 투자기간은?',
    options: [
      { label: '3년 이상', score: 8 },
      { label: '2년 이상', score: 6 },
      { label: '1년 이상', score: 5 },
      { label: '6개월 미만', score: 2 },
    ],
  },
  {
    id: 'lossTolerance',
    label: '투자원금에 손실이 발생할 경우 감수할 수 있는 손실 수준은?',
    options: [
      { label: '기대 수익이 높다면 위험이 높아도 상관없다', score: 32 },
      { label: '20%까지 손실을 감수할 수 있다', score: 24 },
      { label: '10%까지 손실을 감수할 수 있다', score: 16 },
      { label: '무조건 투자원금은 보전되어야 한다', score: 6 },
    ],
  },
];

const getResult = (score) => {
  if (score <= 40) {
    return {
      grade: '안전형',
      summary: '예금 또는 적금 수준의 수익률을 기대하며, 투자원금 손실을 원하지 않는 유형',
      color: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }

  if (score <= 55) {
    return {
      grade: '안전추구형',
      summary: '원금 손실은 최소화하되, 예·적금보다 높은 수익을 위해 일부 변동성 자산을 고려하는 유형',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (score <= 68) {
    return {
      grade: '위험중립형',
      summary: '예·적금보다 높은 수익을 목표로 일정 수준의 손실 위험을 감수할 수 있는 유형',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (score <= 80) {
    return {
      grade: '적극투자형',
      summary: '높은 투자수익을 위해 투자자금의 상당 부분을 위험자산에 투자할 의향이 있는 유형',
      color: 'border-orange-200 bg-orange-50 text-orange-700',
    };
  }

  return {
    grade: '공격투자형',
    summary: '시장평균을 크게 넘는 수익을 추구하며 손실 위험도 적극 수용하는 유형',
    color: 'border-red-200 bg-red-50 text-red-700',
  };
};

export default function InvestmentProfileTest() {
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));
  const answeredCount = answers.filter((value) => value !== null).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const totalScore = answers.reduce((sum, current) => sum + (current || 0), 0);
  const result = useMemo(() => getResult(totalScore), [totalScore]);

  const handleSelect = (questionIndex, score) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = score;
      return next;
    });
  };

  const handleReset = () => {
    setAnswers(Array(QUESTIONS.length).fill(null));
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-foreground/80">
        6개 항목에 답하면 투자성향 점수와 등급이 자동 계산됩니다.
      </p>

      <div className="space-y-2">
        {QUESTIONS.map((question, questionIndex) => (
          <div key={question.id} className="rounded-xl border border-border bg-muted/25 px-3 py-3">
            <p className="text-[13px] font-bold text-foreground">
              {questionIndex + 1}. {question.label}
            </p>
            <div className="mt-2 space-y-2">
              {question.options.map((option) => (
                <button
                  key={`${question.id}-${option.label}`}
                  type="button"
                  onClick={() => handleSelect(questionIndex, option.score)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${
                    answers[questionIndex] === option.score
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {option.label} ({option.score}점)
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3">
        <p className="text-[12px] text-muted-foreground">
          진행도 {answeredCount}/{QUESTIONS.length}
        </p>
        <p className="mt-1 text-[13px] font-bold text-foreground">현재 합산 점수: {totalScore}점</p>
        {isComplete ? (
          <div className={`mt-2 rounded-lg border px-3 py-2 ${result.color}`}>
            <p className="text-[13px] font-extrabold">{result.grade}</p>
            <p className="mt-1 text-[12px] leading-relaxed">{result.summary}</p>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">모든 문항에 답하면 투자성향 결과가 표시됩니다.</p>
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
