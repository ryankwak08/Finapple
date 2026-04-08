import { teenQuizUnitsCatalog } from './teenQuizCatalog.js';

function buildFallbackQuestions(unit, quiz) {
  return [
    {
      question: `${unit.title} 단원에서 가장 먼저 점검해야 할 태도로 가장 적절한 것은?`,
      options: [
        '주변 권유가 있으면 바로 따라한다',
        '목적과 필요를 먼저 확인한 뒤 선택한다',
        '가격이 비싸면 항상 더 좋은 선택이다',
        '손해를 보더라도 기록은 남기지 않는다',
      ],
      answer: 1,
      explanation: `${unit.title}의 핵심은 충동적 반응보다 기준을 먼저 세우는 습관입니다. 목적과 필요를 확인하면 실수를 크게 줄일 수 있습니다.`,
    },
    {
      question: `${quiz.subtitle} 관점에서 옳은 행동은 무엇일까요?`,
      options: [
        '비슷한 조건을 비교하지 않고 바로 결정한다',
        '약관과 조건을 확인하고 이해되지 않으면 질문한다',
        '친구가 괜찮다고 하면 확인 없이 진행한다',
        '위험 신호가 보여도 계속 진행한다',
      ],
      answer: 1,
      explanation: '청소년기 금융 학습에서 공통으로 중요한 원칙은 확인과 비교입니다. 이해되지 않는 조건은 반드시 질문하고 확인해야 피해를 줄일 수 있습니다.',
    },
    {
      question: `다음 중 ${unit.subtitle}를 실천하는 방법으로 가장 적절한 것은?`,
      options: [
        '기록 없이 감으로만 관리한다',
        '한 번 실수하면 다시 점검하지 않는다',
        '작은 금액이라도 계획과 기록을 유지한다',
        '문제가 생기면 혼자 숨기고 넘긴다',
      ],
      answer: 2,
      explanation: '작은 금액도 계획하고 기록하는 습관이 장기적으로 큰 차이를 만듭니다. 반복 점검이 있어야 같은 실수를 줄일 수 있습니다.',
    },
    {
      question: `${unit.title} 학습 이후 실제 생활에서 취할 다음 행동으로 가장 좋은 것은?`,
      options: [
        '이번에 배운 기준으로 나만의 체크리스트를 만든다',
        '다음부터는 아무 기준 없이 즉흥적으로 결정한다',
        '기록은 불필요하니 결과만 기억한다',
        '위험한 상황이어도 경험이라고 생각하고 반복한다',
      ],
      answer: 0,
      explanation: '학습 내용을 행동으로 연결하려면 개인 체크리스트가 가장 효과적입니다. 기준을 문서화하면 실제 선택 상황에서 바로 적용할 수 있습니다.',
    },
    {
      question: `청소년기 금융 의사결정에서 피해야 할 태도는 무엇인가요?`,
      options: [
        '필요한 정보를 확인한 뒤 결정하기',
        '어른이나 기관에 도움 요청하기',
        '위험 신호를 무시하고 빠르게 진행하기',
        '결정 전 대안을 두 가지 이상 비교하기',
      ],
      answer: 2,
      explanation: '위험 신호를 무시하는 태도는 피해를 키우는 대표적인 패턴입니다. 확인, 비교, 도움 요청의 3단계를 지키는 것이 안전합니다.',
    },
  ];
}

export const teenQuizUnits = teenQuizUnitsCatalog.map((unit) => ({
  ...unit,
  quizzes: unit.quizzes.map((quiz) => ({
    ...quiz,
    questions: buildFallbackQuestions(unit, quiz),
  })),
}));
