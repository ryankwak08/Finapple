const TEEN_KDI_SOURCE_URL = 'https://eiec.kdi.re.kr/material/lifeList.do?pp=20&pg=1&life_gubun=b&svalue=';

const teenTopicSeed = [
  {
    id: 'teen-shared-spending',
    icon: '🤝',
    title: '난 함께 쓴다!',
    subtitle: '재화와 서비스의 효과적 관리',
  },
  {
    id: 'teen-smart-consumption',
    icon: '🧠',
    title: '스마트 소비, 세상을 바꾸다!',
    subtitle: '합리적 소비',
  },
  {
    id: 'teen-check-card',
    icon: '💳',
    title: '체크카드 체크하기!',
    subtitle: '다양한 지불수단과 효과적인 체크카드 사용 방법에 대한 이해',
  },
  {
    id: 'teen-ecommerce',
    icon: '🛍️',
    title: '전자상거래 사용 설명서',
    subtitle: '전자상거래 사용에 유의하는 태도',
  },
  {
    id: 'teen-allowance',
    icon: '📒',
    title: '나만의 용돈 관리법',
    subtitle: '용돈 관리',
  },
  {
    id: 'teen-income-management',
    icon: '💼',
    title: '소득을 관리해 드립니다!',
    subtitle: '아르바이트 등을 통해 번 소득의 관리',
  },
  {
    id: 'teen-savings',
    icon: '🏦',
    title: '슬기로운 예금 생활',
    subtitle: '금융상품에 대한 이해와 활용',
  },
  {
    id: 'teen-credit-debt',
    icon: '🧾',
    title: '신용, 너 사용법',
    subtitle: '부채와 신용의 관리',
  },
  {
    id: 'teen-value-of-work',
    icon: '🛠️',
    title: '내 노동의 의미',
    subtitle: '노동의 중요성과 가치에 대한 이해',
  },
  {
    id: 'teen-career-design',
    icon: '🧭',
    title: '꿈스타그램',
    subtitle: '건설적인 진로 설계',
  },
  {
    id: 'teen-labor-rights',
    icon: '⚖️',
    title: '10대의 노동 이야기',
    subtitle: '노동권에 대한 이해와 침해 시 대처',
  },
  {
    id: 'teen-gambling-prevention',
    icon: '🚫',
    title: '인생까지 베팅하겠습니까?',
    subtitle: '도박이나 사행성게임에 대한 주의',
  },
];

function buildTeenTopic(topic, index) {
  const unitNo = index + 1;

  return {
    ...topic,
    course: 'teen',
    sourceUrl: TEEN_KDI_SOURCE_URL,
    summary: `${topic.subtitle}를 중심으로 청소년기의 실제 생활 장면에서 판단 기준을 익히고, 안전하고 책임 있는 금융 습관을 기릅니다.`,
    goals: [
      `${topic.subtitle}의 핵심 개념을 설명할 수 있다`,
      '생활 속 사례에서 올바른 선택 기준을 적용할 수 있다',
      '위험한 선택을 피하고 실천 가능한 대안을 제시할 수 있다',
    ],
    concepts: [
      {
        term: '핵심 원칙',
        definition: `${topic.title} 단원에서 다루는 핵심 규칙을 먼저 정리하고, 선택 전 체크리스트로 활용합니다.`,
      },
      {
        term: '생활 적용',
        definition: '학교, 가정, 온라인 환경 등 청소년이 실제로 겪는 상황에서 개념을 행동으로 연결합니다.',
      },
      {
        term: '위험 신호',
        definition: '손해가 커질 수 있는 패턴을 조기에 인지하고, 도움 요청 및 대처 절차를 익힙니다.',
      },
    ],
    learningPoints: [
      {
        emoji: '📌',
        title: '핵심 개념 빠르게 잡기',
        content: `${topic.subtitle}의 핵심 용어를 먼저 정리하면 문제 풀이 속도와 정확도가 높아집니다. 모르는 용어는 예시 상황과 함께 기억하세요.`,
      },
      {
        emoji: '🧩',
        title: '상황 판단 루틴 만들기',
        content: '선택 전에 목적, 비용, 위험, 대안을 4단계로 점검하세요. 즉흥 결정 대신 짧은 점검 습관이 손실을 크게 줄여줍니다.',
      },
      {
        emoji: '✅',
        title: '실천 체크포인트',
        content: `이번 단원(${unitNo}단원)은 작은 행동 변화가 핵심입니다. 기록하기, 비교하기, 확인하기를 반복하면 ${topic.title} 주제가 생활 습관으로 자리잡습니다.`,
      },
    ],
    pdfUrl: `/textbooks/teen/2U${unitNo}.pdf`,
  };
}

export const teenStudyTopics = teenTopicSeed.map(buildTeenTopic);
export const TEEN_KDI_SOURCE = TEEN_KDI_SOURCE_URL;
