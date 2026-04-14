import { teenQuizUnitsCatalog } from './teenQuizCatalog';
import { oneQuizUnits } from './oneQuizData';

export const youthQuizUnitsCatalog = [
  {
    id: 'unit1',
    icon: '🛒',
    title: '합리적 소비',
    subtitle: "나의 '필요'를 채워주는 현명한 소비",
    studyTopicId: 'rational-consumption',
    quizzes: [
      { id: 'unit1-quiz1', title: '퀴즈 1', subtitle: '소비 습관 진단', xpReward: 50 },
      { id: 'unit1-quiz2', title: '퀴즈 2', subtitle: '예산 관리 실전', xpReward: 50 },
      { id: 'unit1-quiz3', title: '퀴즈 3', subtitle: '소비 심리와 자기 관리', xpReward: 50 },
    ],
  },
  {
    id: 'unit2',
    icon: '💳',
    title: '신용카드',
    subtitle: '신용카드 사용설명서',
    studyTopicId: 'credit-card',
    quizzes: [
      { id: 'unit2-quiz1', title: '퀴즈 1', subtitle: '신용카드 기본 원리', xpReward: 60 },
      { id: 'unit2-quiz2', title: '퀴즈 2', subtitle: '현금서비스·리볼빙·할부', xpReward: 60 },
      { id: 'unit2-quiz3', title: '퀴즈 3', subtitle: '소비자 권리와 분실 대처', xpReward: 60 },
    ],
  },
  {
    id: 'unit3',
    icon: '🏦',
    title: '효과적인 신용 관리',
    subtitle: '무엇이 다를까? 신용에 대한 모든 것',
    studyTopicId: 'credit-management',
    quizzes: [
      { id: 'unit3-quiz1', title: '퀴즈 1', subtitle: '신용의 개념과 평가', xpReward: 60 },
      { id: 'unit3-quiz2', title: '퀴즈 2', subtitle: '신용 관리 10계명', xpReward: 60 },
      { id: 'unit3-quiz3', title: '퀴즈 3', subtitle: '신용 오해와 실전 적용', xpReward: 60 },
    ],
  },
  {
    id: 'unit4',
    icon: '🍳',
    title: '재무레시피',
    subtitle: '3%의 청년들만 아는 비밀',
    studyTopicId: 'financial-recipe',
    quizzes: [
      { id: 'unit4-quiz1', title: '퀴즈 1', subtitle: 'N포세대와 재무목표', xpReward: 70 },
      { id: 'unit4-quiz2', title: '퀴즈 2', subtitle: '청년기 재무사건과 비용', xpReward: 70 },
      { id: 'unit4-quiz3', title: '퀴즈 3', subtitle: '생애주기와 정부지원', xpReward: 70 },
    ],
  },
  {
    id: 'unit5',
    icon: '📈',
    title: '금융상품 사용설명서',
    subtitle: '나에게 맞는 금융상품 선택',
    studyTopicId: 'financial-products',
    quizzes: [
      { id: 'unit5-quiz1', title: '퀴즈 1', subtitle: '안전성·수익성·유동성', xpReward: 70 },
      { id: 'unit5-quiz2', title: '퀴즈 2', subtitle: '예·적금·주식·펼드 비교', xpReward: 70 },
      { id: 'unit5-quiz3', title: '퀴즈 3', subtitle: '투자성향 진단', xpReward: 70 },
    ],
  },
  {
    id: 'unit6',
    icon: '💼',
    title: '청년기 부채 관리',
    subtitle: '청년기 부채, 이것만은 알아두자',
    studyTopicId: 'debt-management',
    quizzes: [
      { id: 'unit6-quiz1', title: '퀴즈 1', subtitle: '읓은 부채 vs 나쁜 부채', xpReward: 70 },
      { id: 'unit6-quiz2', title: '퀴즈 2', subtitle: '금리 유형과 상환 방식', xpReward: 70 },
      { id: 'unit6-quiz3', title: '퀴즈 3', subtitle: '청년 금융 지원 제도', xpReward: 70 },
    ],
  },
  {
    id: 'unit7',
    icon: '🛡️',
    title: '보험과 연금',
    subtitle: '보이지 않는 위험을 피하라!',
    studyTopicId: 'insurance-pension',
    quizzes: [
      { id: 'unit7-quiz1', title: '퀴즈 1', subtitle: '위험 대응과 보험의 이해', xpReward: 70 },
      { id: 'unit7-quiz2', title: '퀴즈 2', subtitle: '연금의 종류와 특징', xpReward: 70 },
      { id: 'unit7-quiz3', title: '퀴즈 3', subtitle: '보험·연금 활용 실전', xpReward: 70 },
    ],
  },
  {
    id: 'unit8',
    icon: '📊',
    title: '프로세금러',
    subtitle: '우리 모두가 국가의 투자자',
    studyTopicId: 'tax-knowledge',
    quizzes: [
      { id: 'unit8-quiz1', title: '퀴즈 1', subtitle: '세금의 기능과 누진세', xpReward: 70 },
      { id: 'unit8-quiz2', title: '퀴즈 2', subtitle: '연말정산과 세금 납부 타이밍', xpReward: 70 },
      { id: 'unit8-quiz3', title: '퀴즈 3', subtitle: '중소기업 절세와 부부 공동명의', xpReward: 70 },
    ],
  },
  {
    id: 'unit9',
    icon: '🚀',
    title: '날갯짓하는 진로',
    subtitle: '진로 설계와 직업 선택',
    studyTopicId: 'career',
    quizzes: [
      { id: 'unit9-quiz1', title: '퀴즈 1', subtitle: '직업 변화와 적성 탐색', xpReward: 70 },
      { id: 'unit9-quiz2', title: '퀴즈 2', subtitle: '직업가치관과 직무능력', xpReward: 70 },
      { id: 'unit9-quiz3', title: '퀴즈 3', subtitle: '직업 정보 탐색과 진로 설계', xpReward: 70 },
    ],
  },
  {
    id: 'unit10',
    icon: '⚖️',
    title: '내 노동권을 지켜라',
    subtitle: '내 소중한 노동권을 지키는 방법',
    studyTopicId: 'labor-rights',
    quizzes: [
      { id: 'unit10-quiz1', title: '퀴즈 1', subtitle: '노동권과 근로계약서', xpReward: 80 },
      { id: 'unit10-quiz2', title: '퀴즈 2', subtitle: '최저임금과 주휴수당', xpReward: 80 },
      { id: 'unit10-quiz3', title: '퀴즈 3', subtitle: '임금체불과 산재보험', xpReward: 80 },
    ],
  },
  {
    id: 'unit11',
    icon: '🏠',
    title: '독립 준비 완전정복',
    subtitle: '독립을 준비하는 당신에게',
    studyTopicId: 'independent-living',
    quizzes: [
      { id: 'unit11-quiz1', title: '퀴즈 1', subtitle: '등기부와 계약서 확인', xpReward: 80 },
      { id: 'unit11-quiz2', title: '퀴즈 2', subtitle: '전입신고와 확정일자', xpReward: 80 },
      { id: 'unit11-quiz3', title: '퀴즈 3', subtitle: '대출과 독립 후 의무', xpReward: 80 },
    ],
  },
  {
    id: 'unit12',
    icon: '📉',
    title: '경제 지표 나침반',
    subtitle: '내 경제생활의 나침반, 경제 지표!',
    studyTopicId: 'economic-indicators',
    quizzes: [
      { id: 'unit12-quiz1', title: '퀴즈 1', subtitle: '소비자물가지수와 인플레이션', xpReward: 80 },
      { id: 'unit12-quiz2', title: '퀴즈 2', subtitle: '금리의 이해', xpReward: 80 },
      { id: 'unit12-quiz3', title: '퀴즈 3', subtitle: '환율의 이해', xpReward: 80 },
    ],
  },
  {
    id: 'unit13',
    icon: '🏛️',
    title: '정부 정책과 우리의 삶',
    subtitle: '정부 정책 변화의 영향 분석',
    studyTopicId: 'government-policy',
    quizzes: [
      { id: 'unit13-quiz1', title: '퀴즈 1', subtitle: '정부 정책의 의미와 재정·통화정책', xpReward: 80 },
      { id: 'unit13-quiz2', title: '퀴즈 2', subtitle: '경제정책 관장 부처', xpReward: 80 },
      { id: 'unit13-quiz3', title: '퀴즈 3', subtitle: '경제정책이 우리 삶에 미치는 영향', xpReward: 80 },
    ],
  },
  {
    id: 'unit14',
    icon: '📰',
    title: '팩트체크, 진실 혹은 거짓',
    subtitle: '경제 정보의 수집과 활용',
    studyTopicId: 'economic-information',
    quizzes: [
      { id: 'unit14-quiz1', title: '퀴즈 1', subtitle: '팩트체크의 필요성과 거짓 정보', xpReward: 80 },
      { id: 'unit14-quiz2', title: '퀴즈 2', subtitle: '거짓 정보 판별 가이드', xpReward: 80 },
      { id: 'unit14-quiz3', title: '퀴즈 3', subtitle: '신뢰할 수 있는 정보 출처', xpReward: 80 },
    ],
  },
  {
    id: 'unit15',
    icon: '📱',
    title: '기술을 만난 금융, 핀테크',
    subtitle: '미래 경제 변화에 대한 대처',
    studyTopicId: 'fintech',
    quizzes: [
      { id: 'unit15-quiz1', title: '퀴즈 1', subtitle: '4차 산업혁명과 블록체인', xpReward: 80 },
      { id: 'unit15-quiz2', title: '퀴즈 2', subtitle: '핀테크 서비스의 종류', xpReward: 80 },
      { id: 'unit15-quiz3', title: '퀴즈 3', subtitle: '핀테크의 영향과 대처 방안', xpReward: 80 },
    ],
  },
  {
    id: 'unit16',
    icon: '🧓',
    title: '청년기에 준비하는 노후연금 3종 세트',
    subtitle: '은퇴 후 준비를 위한 계획 수립과 실천',
    studyTopicId: 'retirement-pension',
    quizzes: [
      { id: 'unit16-quiz1', title: '퀴즈 1', subtitle: '노후 준비의 필요성과 복리의 마법', xpReward: 80 },
      { id: 'unit16-quiz2', title: '퀴즈 2', subtitle: '노후연금 3종 세트의 구조', xpReward: 80 },
      { id: 'unit16-quiz3', title: '퀴즈 3', subtitle: '개인연금과 연금상품 관리', xpReward: 80 },
    ],
  },
];

export const quizCatalogByCourse = {
  start: youthQuizUnitsCatalog,
  one: oneQuizUnits.map((unit) => ({
    id: unit.id,
    icon: unit.icon,
    title: unit.title,
    subtitle: unit.subtitle,
    studyTopicId: unit.studyTopicId,
    quizzes: unit.quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      subtitle: quiz.subtitle,
      xpReward: quiz.xpReward,
    })),
  })),
  youth: youthQuizUnitsCatalog,
  teen: teenQuizUnitsCatalog,
};

export const quizUnitsCatalog = youthQuizUnitsCatalog;

const unitEnglishMeta = {
  unit1: { titleEn: 'Smart Spending', subtitleEn: "Wise spending that meets your real needs" },
  unit2: { titleEn: 'Credit Cards', subtitleEn: 'Your guide to using credit cards well' },
  unit3: { titleEn: 'Effective Credit Management', subtitleEn: 'Everything you need to know about credit' },
  unit4: { titleEn: 'Financial Recipe', subtitleEn: 'The money plan only 3% of young adults know' },
  unit5: { titleEn: 'Guide to Financial Products', subtitleEn: 'Choose the right product for you' },
  unit6: { titleEn: 'Debt Management for Young Adults', subtitleEn: 'What you should know about debt early on' },
  unit7: { titleEn: 'Insurance and Pensions', subtitleEn: 'Prepare for risks you cannot see' },
  unit8: { titleEn: 'Tax Basics', subtitleEn: 'We are all investors in our country' },
  unit9: { titleEn: 'Career in Motion', subtitleEn: 'Career planning and job choices' },
  unit10: { titleEn: 'Protect Your Labor Rights', subtitleEn: 'How to protect your rights at work' },
  unit11: { titleEn: 'Independent Living Guide', subtitleEn: 'A complete guide to preparing for independence' },
  unit12: { titleEn: 'Economic Indicators Compass', subtitleEn: 'Economic indicators for everyday life' },
  unit13: { titleEn: 'Government Policy and Our Lives', subtitleEn: 'Understanding how policy changes affect us' },
  unit14: { titleEn: 'Fact Check: True or False', subtitleEn: 'Finding and using trustworthy economic information' },
  unit15: { titleEn: 'Fintech: Finance Meets Technology', subtitleEn: 'Adapting to changes in the future economy' },
  unit16: { titleEn: 'Retirement Planning for Young Adults', subtitleEn: 'Plan and act early for life after retirement' },
};

const quizEnglishMeta = {
  'unit1-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Spending habit check' },
  'unit1-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Budgeting in practice' },
  'unit1-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Spending psychology and self-control' },
  'unit2-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Credit card basics' },
  'unit2-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Cash advances, revolving, and installments' },
  'unit2-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Consumer rights and lost card response' },
  'unit3-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'What credit means and how it is scored' },
  'unit3-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'The 10 rules of credit management' },
  'unit3-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Credit myths and real-world use' },
  'unit4-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Young adults and money goals' },
  'unit4-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Major money events and costs' },
  'unit4-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Life stages and government support' },
  'unit5-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Safety, return, and liquidity' },
  'unit5-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Deposits, savings, stocks, and funds' },
  'unit5-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Investment profile check' },
  'unit6-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Good debt vs. bad debt' },
  'unit6-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Interest types and repayment methods' },
  'unit6-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Financial support programs for young adults' },
  'unit7-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Risk response and insurance basics' },
  'unit7-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Types of pensions and their features' },
  'unit7-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Using insurance and pensions in real life' },
  'unit8-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'What taxes do and progressive tax' },
  'unit8-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Year-end tax settlement and payment timing' },
  'unit8-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Tax savings for SMEs and joint ownership' },
  'unit9-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Changes in work and aptitude discovery' },
  'unit9-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Work values and job skills' },
  'unit9-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Career research and planning' },
  'unit10-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Labor rights and employment contracts' },
  'unit10-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Minimum wage and weekly holiday pay' },
  'unit10-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Unpaid wages and workers compensation' },
  'unit11-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Registry and contract checks' },
  'unit11-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Move-in report and fixed date' },
  'unit11-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Loans and responsibilities after moving out' },
  'unit12-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Consumer price index and inflation' },
  'unit12-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Understanding interest rates' },
  'unit12-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Understanding exchange rates' },
  'unit13-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'What policy means and fiscal vs. monetary policy' },
  'unit13-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Government departments in charge of economic policy' },
  'unit13-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'How economic policy affects our lives' },
  'unit14-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Why fact-checking matters and false information' },
  'unit14-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Guide to spotting false information' },
  'unit14-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Reliable information sources' },
  'unit15-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'The fourth industrial revolution and blockchain' },
  'unit15-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'Types of fintech services' },
  'unit15-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Fintech impact and how to respond' },
  'unit16-quiz1': { titleEn: 'Quiz 1', subtitleEn: 'Why retirement planning matters and the magic of compounding' },
  'unit16-quiz2': { titleEn: 'Quiz 2', subtitleEn: 'The structure of the three pension pillars' },
  'unit16-quiz3': { titleEn: 'Quiz 3', subtitleEn: 'Personal pensions and managing pension products' },
};

export function getQuizUnitsCatalog(course = 'youth') {
  return quizCatalogByCourse[course] || youthQuizUnitsCatalog;
}

export function getLocalizedQuizUnit(unit, isEnglish = false) {
  if (!isEnglish) {
    return unit;
  }

  const localized = unitEnglishMeta[unit.id];
  if (!localized) {
    return unit;
  }

  return {
    ...unit,
    title: localized.titleEn,
    subtitle: localized.subtitleEn,
  };
}

export function getLocalizedQuizMeta(quizId, fallback = {}) {
  const localized = quizEnglishMeta[quizId];
  if (!localized) {
    return {
      title: fallback.title,
      subtitle: fallback.subtitle,
    };
  }

  return {
    title: localized.titleEn,
    subtitle: localized.subtitleEn,
  };
}

export const TOTAL_QUIZ_COUNT = [quizCatalogByCourse.youth, quizCatalogByCourse.one, quizCatalogByCourse.teen]
  .flat()
  .reduce((count, unit) => count + unit.quizzes.length + 1, 0);

export function getQuizUnitCatalogByStudyTopicId(studyTopicId, course) {
  if (course) {
    return getQuizUnitsCatalog(course).find((unit) => unit.studyTopicId === studyTopicId) || null;
  }

  return Object.values(quizCatalogByCourse)
    .flat()
    .find((unit) => unit.studyTopicId === studyTopicId) || null;
}
