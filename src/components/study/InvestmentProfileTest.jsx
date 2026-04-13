import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

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

const QUESTIONS_EN = [
  {
    id: 'age',
    label: 'What is your age?',
    options: [
      { label: '29 or younger', score: 8 },
      { label: '30 or older', score: 6 },
      { label: '40 or older', score: 5 },
      { label: '50 or older', score: 3 },
    ],
  },
  {
    id: 'income',
    label: 'Which option best describes your income?',
    options: [
      { label: 'I have stable regular income and expect it to stay the same or grow', score: 17 },
      { label: 'I have regular income, but I expect it to fall or become unstable', score: 10 },
      { label: 'My income is temporary or occasional', score: 5 },
      { label: 'I currently have no income', score: 3 },
    ],
  },
  {
    id: 'knowledge',
    label: 'How would you rate your knowledge of financial products?',
    options: [
      { label: 'I understand the differences among all major investment products', score: 18 },
      { label: 'I can distinguish most financial products', score: 13 },
      { label: 'I can tell the difference between stocks and bonds', score: 8 },
      { label: 'I only know deposits and savings products', score: 3 },
    ],
  },
  {
    id: 'experience',
    label: 'Which option is closest to your investment experience?',
    options: [
      { label: 'Bank deposits and savings accounts', score: 3 },
      { label: 'High-credit corporate bonds, such as bond funds', score: 8 },
      { label: 'Stock funds targeting market-level returns', score: 14 },
      { label: 'Derivative funds that pursue high returns', score: 17 },
    ],
  },
  {
    id: 'period',
    label: 'How long do you plan to keep this money invested?',
    options: [
      { label: '3 years or more', score: 8 },
      { label: '2 years or more', score: 6 },
      { label: '1 year or more', score: 5 },
      { label: 'Less than 6 months', score: 2 },
    ],
  },
  {
    id: 'lossTolerance',
    label: 'How much loss in principal could you tolerate?',
    options: [
      { label: 'If the return potential is high, I am okay with high risk too', score: 32 },
      { label: 'I can tolerate losses of up to 20%', score: 24 },
      { label: 'I can tolerate losses of up to 10%', score: 16 },
      { label: 'My principal must be protected no matter what', score: 6 },
    ],
  },
];

const getResult = (score, isEnglish = false) => {
  if (score <= 40) {
    return {
      grade: isEnglish ? 'Conservative' : '안전형',
      summary: isEnglish ? 'You expect returns similar to deposits or savings and do not want any loss of principal.' : '예금 또는 적금 수준의 수익률을 기대하며, 투자원금 손실을 원하지 않는 유형',
      color: 'border-sky-200 bg-sky-50 text-sky-700',
    };
  }

  if (score <= 55) {
    return {
      grade: isEnglish ? 'Cautious growth' : '안전추구형',
      summary: isEnglish ? 'You want to minimize loss of principal but are open to some volatility for returns above deposits and savings.' : '원금 손실은 최소화하되, 예·적금보다 높은 수익을 위해 일부 변동성 자산을 고려하는 유형',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (score <= 68) {
    return {
      grade: isEnglish ? 'Balanced risk' : '위험중립형',
      summary: isEnglish ? 'You aim for returns above deposits and savings and can accept a reasonable level of loss risk.' : '예·적금보다 높은 수익을 목표로 일정 수준의 손실 위험을 감수할 수 있는 유형',
      color: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (score <= 80) {
    return {
      grade: isEnglish ? 'Active investor' : '적극투자형',
      summary: isEnglish ? 'You are willing to place a meaningful share of your money in risky assets to pursue higher returns.' : '높은 투자수익을 위해 투자자금의 상당 부분을 위험자산에 투자할 의향이 있는 유형',
      color: 'border-orange-200 bg-orange-50 text-orange-700',
    };
  }

  return {
    grade: isEnglish ? 'Aggressive investor' : '공격투자형',
    summary: isEnglish ? 'You pursue returns well above the market average and actively accept the possibility of losses.' : '시장평균을 크게 넘는 수익을 추구하며 손실 위험도 적극 수용하는 유형',
    color: 'border-red-200 bg-red-50 text-red-700',
  };
};

export default function InvestmentProfileTest() {
  const { isEnglish } = useLanguage();
  const [answers, setAnswers] = useState(() => Array(QUESTIONS.length).fill(null));
  const answeredCount = answers.filter((value) => value !== null).length;
  const isComplete = answeredCount === QUESTIONS.length;
  const totalScore = answers.reduce((sum, current) => sum + (current || 0), 0);
  const questions = isEnglish ? QUESTIONS_EN : QUESTIONS;
  const result = useMemo(() => getResult(totalScore, isEnglish), [isEnglish, totalScore]);

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
        {isEnglish
          ? 'Answer all 6 items to calculate your investment profile score and level.'
          : '6개 항목에 답하면 투자성향 점수와 등급이 자동 계산됩니다.'}
      </p>

      <div className="space-y-2">
        {questions.map((question, questionIndex) => (
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
                  {option.label} {isEnglish ? `(${option.score} pts)` : `(${option.score}점)`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background px-3 py-3">
        <p className="text-[12px] text-muted-foreground">
          {isEnglish ? `Progress ${answeredCount}/${QUESTIONS.length}` : `진행도 ${answeredCount}/${QUESTIONS.length}`}
        </p>
        <p className="mt-1 text-[13px] font-bold text-foreground">{isEnglish ? `Current total score: ${totalScore} pts` : `현재 합산 점수: ${totalScore}점`}</p>
        {isComplete ? (
          <div className={`mt-2 rounded-lg border px-3 py-2 ${result.color}`}>
            <p className="text-[13px] font-extrabold">{result.grade}</p>
            <p className="mt-1 text-[12px] leading-relaxed">{result.summary}</p>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">{isEnglish ? 'Your investment profile will appear after you answer every question.' : '모든 문항에 답하면 투자성향 결과가 표시됩니다.'}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
        >
          {isEnglish ? 'Reset' : '다시 하기'}
        </button>
      </div>
    </div>
  );
}
