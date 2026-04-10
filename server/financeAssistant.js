const INTENT_KEYWORDS_KO = {
  예산관리: ['월급', '가계부', '예산', '지출', '고정비', '소비'],
  신용점수관리: ['신용점수', '신용', '연체', '카드값', '카드대금'],
  전월세주거금융: ['전세', '월세', '보증금', '임대차', '전월세'],
  청약: ['청약', '주택청약', '특별공급', '1순위'],
  연말정산세금: ['연말정산', '연말 정산', '연말', '정산', '소득공제', '세액공제', '종합소득세', '부가세', '세금'],
  보험연금: ['보험', '실손', '연금', 'irp', '국민연금', '퇴직연금'],
  투자기초: ['투자', '주식', 'etf', '적립식', '포트폴리오', '분산투자'],
  창업자금: ['창업자금', '창업대출', '사업계획서', '정책자금', '지원금'],
  사업자등록: ['사업자등록', '사업자 등록', '홈택스', '사업자등록증'],
  청년지원정책: ['청년도약계좌', '청년희망적금', '청년지원', '청년정책'],
  대출: ['대출', '금리', '상환', '한도', '이자'],
  계좌개설: ['통장', '계좌', '비대면', '은행 계좌'],
  해외송금: ['해외송금', 'swift', '국제 송금', '환율'],
};

const INTENT_KEYWORDS_EN = {
  예산관리: ['budget', 'spending', 'expense', 'salary plan', 'monthly plan'],
  신용점수관리: ['credit score', 'credit', 'delinquent', 'late payment', 'card bill'],
  전월세주거금융: ['jeonse', 'rent', 'deposit', 'lease', 'housing loan'],
  청약: ['housing subscription', 'subscription account', 'special supply', 'home subscription'],
  연말정산세금: ['year-end tax', 'year end tax', 'tax return', 'deduction', 'income tax', 'tax'],
  보험연금: ['insurance', 'pension', 'national pension', 'retirement pension', 'irp'],
  투자기초: ['investment', 'stock', 'etf', 'portfolio', 'long term'],
  창업자금: ['startup fund', 'startup loan', 'business plan', 'policy fund', 'grant'],
  사업자등록: ['business registration', 'hometax', 'business certificate'],
  청년지원정책: ['youth policy', 'youth support', 'youth account', 'government support'],
  대출: ['loan', 'interest rate', 'repayment', 'loan limit'],
  계좌개설: ['bank account', 'open account', 'non-face-to-face account', 'savings account'],
  해외송금: ['overseas transfer', 'international transfer', 'swift', 'exchange rate'],
};

const YOUTH_CORE_QUESTIONS = {
  '소비(지출)관리': [
    '월급 들어오면 예산을 어떻게 나눠야 하나요?',
    '고정비를 줄이는 가장 빠른 방법은 무엇인가요?',
    '체크카드/신용카드 사용 비중은 어떻게 잡아야 하나요?',
  ],
  자산관리: [
    '비상금은 얼마나 모아두는 게 좋나요?',
    '적금과 ETF 투자를 어떤 비율로 시작하면 좋을까요?',
    '신용점수를 안정적으로 올리는 실전 루틴이 있나요?',
  ],
  '진로탐색/창업': [
    '사업자등록 전 반드시 확인해야 할 체크리스트는 무엇인가요?',
    '창업 자금은 대출과 지원금 중 무엇부터 알아봐야 하나요?',
  ],
  변화대응: [
    '금리 오를 때 대출 관리 전략은 어떻게 바꿔야 하나요?',
    '소득이 불안정할 때 지출 구조를 어떻게 재편해야 하나요?',
  ],
  노후대비: [
    '국민연금, 퇴직연금, 개인연금을 어떻게 조합해야 하나요?',
    'IRP를 시작할 때 수수료와 상품은 무엇을 비교해야 하나요?',
  ],
};

const DOCUMENTS = [
  {
    title: '청년 지원 정책 금융 안내',
    content: '청년 대상 금융정책은 연령, 소득, 근로 여부 조건이 달라 자격을 먼저 확인해야 합니다.',
    intent: '청년지원정책',
    required_documents: ['신분증', '소득 관련 서류', '재직/근로 확인 자료'],
    next_actions: ['본인 조건을 정리합니다.', '정책 상품별 자격요건을 비교합니다.', '가능한 상품부터 우선 신청합니다.'],
    links: [
      { name: '청년정책 통합포털', url: 'https://www.youthcenter.go.kr' },
      { name: '서민금융진흥원', url: 'https://www.kinfa.or.kr' },
    ],
  },
  {
    title: '월급 예산 관리 가이드',
    content: '월급은 고정비, 생활비, 저축/투자, 비상금으로 구분해 예산을 먼저 배정하는 것이 핵심입니다.',
    intent: '예산관리',
    required_documents: ['최근 3개월 카드/계좌 지출내역', '급여명세서'],
    next_actions: ['고정비/변동비를 분류합니다.', '월 예산 상한을 항목별로 설정합니다.', '주 단위로 점검합니다.'],
    links: [{ name: '금융감독원 금융교육센터', url: 'https://www.fss.or.kr' }],
  },
  {
    title: '신용점수 관리 안내',
    content: '신용점수는 연체 방지, 카드 사용률 관리, 대출 조회 습관 개선으로 꾸준히 관리할 수 있습니다.',
    intent: '신용점수관리',
    required_documents: ['본인인증 수단', '신용조회 서비스 계정'],
    next_actions: ['정기 조회로 변동 원인을 확인합니다.', '자동이체로 연체를 방지합니다.', '단기 대출 의존도를 낮춥니다.'],
    links: [{ name: '금융소비자 정보포털 파인', url: 'https://fine.fss.or.kr' }],
  },
  {
    title: '전월세 주거 금융 안내',
    content: '전월세 계약 전에는 보증금 안전성, 대출 한도, 상환계획을 함께 확인해야 합니다.',
    intent: '전월세주거금융',
    required_documents: ['신분증', '임대차계약서', '소득증빙서류'],
    next_actions: ['권리관계를 확인합니다.', '월 상환액을 계산합니다.', '확정일자 등 보호 절차를 진행합니다.'],
    links: [
      { name: '주택도시기금', url: 'https://nhuf.molit.go.kr' },
      { name: '정부24', url: 'https://www.gov.kr' },
    ],
  },
  {
    title: '청약 준비 가이드',
    content: '청약은 가입기간, 납입횟수, 무주택 여부 등 자격요건을 먼저 확인해야 합니다.',
    intent: '청약',
    required_documents: ['신분증', '주민등록등본', '청약통장 정보'],
    next_actions: ['자격을 확인합니다.', '공고를 모니터링합니다.', '가점 및 특별공급 가능성을 점검합니다.'],
    links: [{ name: '청약홈', url: 'https://www.applyhome.co.kr' }],
  },
  {
    title: '연말정산/세금 기본 안내',
    content: '연말정산은 공제항목을 미리 정리하고 증빙 자료를 빠짐없이 준비하는 것이 중요합니다.',
    intent: '연말정산세금',
    required_documents: ['근로소득 원천징수영수증', '공제 증빙자료', '홈택스 계정'],
    next_actions: ['공제 대상 항목을 정리합니다.', '누락 증빙을 보완합니다.', '환급/추가납부 금액을 확인합니다.'],
    links: [{ name: '국세청 홈택스', url: 'https://www.hometax.go.kr' }],
  },
  {
    title: '보험/연금 시작 가이드',
    content: '청년층은 과도한 보험보다 필수 보장 중심으로 설계하고, 연금은 조기에 소액이라도 시작하는 것이 좋습니다.',
    intent: '보험연금',
    required_documents: ['기존 보험 증권', '소득/지출 정보'],
    next_actions: ['기존 보장을 점검합니다.', '필수 보장 우선순위를 정합니다.', '연금 계좌 적립 계획을 세웁니다.'],
    links: [
      { name: '금융감독원 파인', url: 'https://fine.fss.or.kr' },
      { name: '국민연금공단', url: 'https://www.nps.or.kr' },
    ],
  },
  {
    title: '투자 기초 가이드',
    content: '투자는 목표 기간, 위험 성향, 분산 원칙을 기준으로 소액부터 장기적으로 시작하는 것이 기본입니다.',
    intent: '투자기초',
    required_documents: ['투자계좌', '위험성향 파악 결과'],
    next_actions: ['투자 목적/기간을 설정합니다.', '분산 포트폴리오를 구성합니다.', '리밸런싱 주기를 정합니다.'],
    links: [{ name: '금융투자협회', url: 'https://www.kofia.or.kr' }],
  },
  {
    title: '창업 자금 준비 안내',
    content: '창업 자금은 자기자본, 정책자금, 대출을 분리해 계획하고 상환 가능성을 먼저 검토해야 합니다.',
    intent: '창업자금',
    required_documents: ['사업계획서', '예상 매출/비용 계획', '신분증'],
    next_actions: ['초기 비용을 작성합니다.', '정책자금/대출 조건을 비교합니다.', '상환 계획을 수립합니다.'],
    links: [
      { name: '중소벤처기업부', url: 'https://www.mss.go.kr' },
      { name: '소상공인시장진흥공단', url: 'https://www.semas.or.kr' },
    ],
  },
  {
    title: '사업자등록 신청 안내',
    content: '사업자등록은 홈택스에서 온라인 신청이 가능하며, 신청 후 사업자등록증을 발급받을 수 있습니다.',
    intent: '사업자등록',
    required_documents: ['신분증', '임대차계약서(해당 시)', '업종별 인허가 서류(해당 시)'],
    next_actions: ['업종을 확정합니다.', '홈택스에서 신청합니다.', '등록증 발급 후 세무 일정을 등록합니다.'],
    links: [
      { name: '국세청 홈택스', url: 'https://www.hometax.go.kr' },
      { name: '정부24', url: 'https://www.gov.kr' },
    ],
  },
  {
    title: '대출 신청 안내',
    content: '대출 신청 시 필요한 기본 서류는 신분증, 소득 증빙 서류, 재직 관련 서류입니다.',
    intent: '대출',
    required_documents: ['신분증', '소득증빙서류', '재직증명서 또는 건강보험 자격득실 확인서'],
    next_actions: ['서류를 준비합니다.', '한도/금리를 비교합니다.', '상환계획 확인 후 신청합니다.'],
    links: [
      { name: '정부24', url: 'https://www.gov.kr' },
      { name: '4대사회보험 정보연계센터', url: 'https://www.4insure.or.kr' },
    ],
  },
  {
    title: '계좌 개설 절차',
    content: '계좌 개설은 신분증 인증 후 모바일 앱 또는 영업점에서 진행할 수 있습니다.',
    intent: '계좌개설',
    required_documents: ['신분증', '본인명의 휴대폰', '추가 본인확인 자료(은행 정책에 따라)'],
    next_actions: ['통장 유형을 선택합니다.', '비대면 개설을 진행합니다.', '이체 한도를 설정합니다.'],
    links: [
      { name: '어카운트인포', url: 'https://www.payinfo.or.kr' },
      { name: '금융감독원 파인', url: 'https://fine.fss.or.kr' },
    ],
  },
  {
    title: '해외송금 방법',
    content: '해외 송금은 수취인 정보, 계좌번호, SWIFT 코드 입력 후 진행합니다.',
    intent: '해외송금',
    required_documents: ['신분증', '수취인 영문명', '수취은행 SWIFT 코드', '수취계좌번호'],
    next_actions: ['수취인 정보를 확인합니다.', '수수료/환율을 비교합니다.', '송금을 실행합니다.'],
    links: [
      { name: '관세청', url: 'https://www.customs.go.kr' },
      { name: '한국은행 경제통계시스템', url: 'https://ecos.bok.or.kr' },
    ],
  },
];

const normalize = (value = '') => String(value).toLowerCase().trim();
const isEnglishLocale = (locale = 'ko') => String(locale || 'ko').toLowerCase().startsWith('en');
const getKeywordsByLocale = (locale = 'ko') => (isEnglishLocale(locale) ? INTENT_KEYWORDS_EN : INTENT_KEYWORDS_KO);

const localizeDoc = (doc, locale = 'ko') => {
  if (!isEnglishLocale(locale)) {
    return doc;
  }

  const titleMap = {
    청년지원정책: 'Youth Financial Policy Guide',
    예산관리: 'Monthly Budget Guide',
    신용점수관리: 'Credit Score Management Guide',
    전월세주거금융: 'Housing Finance Guide',
    청약: 'Housing Subscription Guide',
    연말정산세금: 'Year-end Tax Guide',
    보험연금: 'Insurance & Pension Starter Guide',
    투자기초: 'Investment Basics Guide',
    창업자금: 'Startup Funding Guide',
    사업자등록: 'Business Registration Guide',
    대출: 'Loan Application Guide',
    계좌개설: 'Bank Account Opening Guide',
    해외송금: 'Overseas Transfer Guide',
  };

  const contentMap = {
    청년지원정책: 'Youth financial policy products require checking eligibility first, including age, income, and work status.',
    예산관리: 'The key is to allocate your salary first into fixed costs, living costs, savings/investments, and emergency funds.',
    신용점수관리: 'Credit scores improve through avoiding late payments, managing card usage, and maintaining healthy borrowing habits.',
    전월세주거금융: 'Before signing a rental contract, check deposit safety, loan limits, and repayment plans together.',
    청약: 'For housing subscription, check eligibility such as subscription period, payment count, and no-home ownership status first.',
    연말정산세금: 'For year-end tax settlement, organize deduction items early and prepare supporting documents without missing anything.',
    보험연금: 'For young adults, prioritize essential coverage and start pension contributions early, even with small amounts.',
    투자기초: 'Start investing with clear goals, risk profile, and diversification, preferably in a long-term approach.',
    창업자금: 'For startup funding, separate self-capital, policy funds, and loans, then review repayment feasibility first.',
    사업자등록: 'Business registration can be completed online via Hometax, and the registration certificate can be issued afterward.',
    대출: 'Basic loan documents include ID, income proof, and employment-related documents.',
    계좌개설: 'Bank account opening can be done via mobile app or branch after identity verification.',
    해외송금: 'Overseas transfer requires recipient details, account number, and SWIFT code.',
  };

  const requiredMap = {
    신분증: 'ID card',
    '소득 관련 서류': 'Income-related documents',
    '재직/근로 확인 자료': 'Employment verification documents',
    '최근 3개월 카드/계좌 지출내역': 'Last 3 months of card/account spending history',
    급여명세서: 'Payslip',
    '본인인증 수단': 'Identity verification method',
    '신용조회 서비스 계정': 'Credit inquiry service account',
    임대차계약서: 'Lease contract',
    소득증빙서류: 'Income proof documents',
    주민등록등본: 'Resident registration document',
    청약통장정보: 'Subscription account details',
    '청약통장 정보': 'Subscription account details',
    '근로소득 원천징수영수증': 'Withholding tax statement',
    근로소득원천징수영수증: 'Withholding tax statement',
    '공제 증빙자료': 'Deduction proof documents',
    홈택스계정: 'Hometax account',
    '홈택스 계정': 'Hometax account',
    '기존 보험 증권': 'Existing insurance policy documents',
    '소득/지출 정보': 'Income and spending data',
    투자계좌: 'Investment account',
    '위험성향 파악 결과': 'Risk profile result',
    사업계획서: 'Business plan',
    '예상 매출/비용 계획': 'Projected revenue/cost plan',
    '임대차계약서(해당 시)': 'Lease contract (if applicable)',
    '업종별 인허가 서류(해당 시)': 'Industry-specific license documents (if applicable)',
    소득증빙서류: 'Income proof documents',
    '재직증명서 또는 건강보험 자격득실 확인서': 'Employment certificate or health insurance qualification history',
    '본인명의 휴대폰': 'Mobile phone under your name',
    '추가 본인확인 자료(은행 정책에 따라)': 'Additional identity verification documents (by bank policy)',
    수취인영문명: 'Recipient full name (English)',
    수취은행SWIFT코드: 'Recipient bank SWIFT code',
    수취계좌번호: 'Recipient account number',
    '수취인 영문명': 'Recipient full name (English)',
    '수취은행 SWIFT 코드': 'Recipient bank SWIFT code',
    수취계좌번호: 'Recipient account number',
  };

  const actionMap = {
    '본인 조건을 정리합니다.': 'Organize your eligibility conditions first.',
    '정책 상품별 자격요건을 비교합니다.': 'Compare eligibility requirements by policy product.',
    '가능한 상품부터 우선 신청합니다.': 'Apply first to the products you are eligible for.',
    '고정비/변동비를 분류합니다.': 'Classify fixed and variable costs.',
    '월 예산 상한을 항목별로 설정합니다.': 'Set monthly budget limits by category.',
    '주 단위로 점검합니다.': 'Review your budget weekly.',
    '정기 조회로 변동 원인을 확인합니다.': 'Check your score regularly and track changes.',
    '자동이체로 연체를 방지합니다.': 'Use auto-pay to avoid late payments.',
    '단기 대출 의존도를 낮춥니다.': 'Reduce reliance on short-term borrowing.',
    '권리관계를 확인합니다.': 'Verify legal ownership/rights information.',
    '월 상환액을 계산합니다.': 'Calculate monthly repayment amount.',
    '확정일자 등 보호 절차를 진행합니다.': 'Complete protection steps such as official date registration.',
    '자격을 확인합니다.': 'Check your eligibility first.',
    '공고를 모니터링합니다.': 'Monitor housing subscription announcements.',
    '가점 및 특별공급 가능성을 점검합니다.': 'Review score and special supply eligibility.',
    '공제 대상 항목을 정리합니다.': 'Organize eligible deduction items.',
    '누락 증빙을 보완합니다.': 'Fill missing supporting documents.',
    '환급/추가납부 금액을 확인합니다.': 'Check refund/additional payment amount.',
    '기존 보장을 점검합니다.': 'Review your current coverage.',
    '필수 보장 우선순위를 정합니다.': 'Set priority for essential coverage.',
    '연금 계좌 적립 계획을 세웁니다.': 'Plan pension account contributions.',
    '투자 목적/기간을 설정합니다.': 'Set investment goals and horizon.',
    '분산 포트폴리오를 구성합니다.': 'Build a diversified portfolio.',
    '리밸런싱 주기를 정합니다.': 'Set a rebalancing cycle.',
    '초기 비용을 작성합니다.': 'List startup costs.',
    '정책자금/대출 조건을 비교합니다.': 'Compare policy funding and loan conditions.',
    '상환 계획을 수립합니다.': 'Create a repayment plan.',
    '업종을 확정합니다.': 'Finalize your business category.',
    '홈택스에서 신청합니다.': 'Apply on Hometax.',
    '등록증 발급 후 세무 일정을 등록합니다.': 'After issuance, register your tax schedule.',
    '서류를 준비합니다.': 'Prepare required documents.',
    '한도/금리를 비교합니다.': 'Compare limits and interest rates.',
    '상환계획 확인 후 신청합니다.': 'Apply after checking your repayment plan.',
    '통장 유형을 선택합니다.': 'Choose account type.',
    '비대면 개설을 진행합니다.': 'Proceed with non-face-to-face account opening.',
    '이체 한도를 설정합니다.': 'Set transfer limits.',
    '수취인 정보를 확인합니다.': 'Verify recipient information.',
    '수수료/환율을 비교합니다.': 'Compare fees and exchange rates.',
    '송금을 실행합니다.': 'Execute the transfer.',
  };

  return {
    ...doc,
    title: titleMap[doc.intent] || doc.title,
    content: contentMap[doc.intent] || doc.content,
    required_documents: (doc.required_documents || []).map((item) => requiredMap[item] || item),
    next_actions: (doc.next_actions || []).map((item) => actionMap[item] || item),
    links: (doc.links || []).map((link) => ({
      ...link,
      name: ({
        '청년정책 통합포털': 'Youth Policy Portal',
        서민금융진흥원: 'Korea Inclusive Finance Agency',
        '금융감독원 금융교육센터': 'FSS Financial Education Center',
        '금융소비자 정보포털 파인': 'FINE (Financial Consumer Portal)',
        주택도시기금: 'Housing & Urban Fund',
        정부24: 'Gov24',
        청약홈: 'ApplyHome',
        '국세청 홈택스': 'Hometax',
        '금융감독원 파인': 'FINE (FSS)',
        국민연금공단: 'National Pension Service',
        금융투자협회: 'KOFIA',
        중소벤처기업부: 'MSS',
        소상공인시장진흥공단: 'SEMAS',
        '4대사회보험 정보연계센터': '4 Social Insurance Information Center',
        어카운트인포: 'Account Info',
        관세청: 'Korea Customs Service',
        '한국은행 경제통계시스템': 'Bank of Korea ECOS',
      }[link.name] || link.name),
    })),
  };
};

const routeIntentByKeywords = (query = '', locale = 'ko') => {
  const keywordsTable = getKeywordsByLocale(locale);
  const text = normalize(query);
  let bestIntent = null;
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(keywordsTable)) {
    const score = keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestIntent = intent;
      bestScore = score;
    }
  }

  return { intent: bestIntent, score: bestScore };
};

const computeIntentCandidates = (query = '', locale = 'ko') => {
  const keywordsTable = getKeywordsByLocale(locale);
  const text = normalize(query);
  const scored = Object.entries(keywordsTable).map(([intent, keywords]) => {
    const hits = keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);
    return { intent, hits };
  });

  scored.sort((a, b) => b.hits - a.hits);
  const top = scored.slice(0, 3);
  const total = top.reduce((acc, item) => acc + item.hits, 0) || 1;
  return top.map((item) => ({
    intent: item.intent,
    confidence: item.hits > 0 ? item.hits / total : 0,
  }));
};

export const getYouthCoreQuestions = (locale = 'ko') => {
  if (!isEnglishLocale(locale)) {
    return YOUTH_CORE_QUESTIONS;
  }

  return {
    'Spending & Budget': [
      'How should I split my salary budget every month?',
      'What is the fastest way to reduce fixed costs?',
      'How should I balance debit and credit card usage?',
    ],
    'Asset Management': [
      'How much emergency fund should I build?',
      'What is a good starting ratio between savings and ETF investing?',
      'What is a practical routine to improve my credit score?',
    ],
    'Career & Startup': [
      'What should I check before business registration?',
      'For startup funding, should I check loans or grants first?',
    ],
    'Risk Response': [
      'How should I adjust loan strategy when interest rates rise?',
      'How should I restructure spending when income is unstable?',
    ],
    'Retirement': [
      'How should I combine national pension, retirement pension, and private pension?',
      'What should I compare first when starting IRP?',
    ],
  };
};

export const buildFinanceChatResponse = ({ query, ownedDocuments: _ownedDocuments = [], locale = 'ko' }) => {
  const { intent, score } = routeIntentByKeywords(query, locale);
  const intentCandidates = computeIntentCandidates(query, locale);
  const defaultIntent = isEnglishLocale(locale) ? '투자기초' : '연말정산세금';
  const predictedIntent = intent || defaultIntent;
  const confidence = score > 0 ? Math.min(0.86 + (score - 1) * 0.04, 0.98) : 0.4;

  const matchedDocs = DOCUMENTS.filter((doc) => doc.intent === predictedIntent);
  const docs = (matchedDocs.length ? matchedDocs : DOCUMENTS.slice(0, 3)).map((doc) => ({
    ...localizeDoc(doc, locale),
    score: confidence,
  }));

  const clarificationQuestion = score <= 0 && intentCandidates[1]
    ? (isEnglishLocale(locale)
      ? `Is your question closer to '${intentCandidates[0].intent}' or '${intentCandidates[1].intent}'?`
      : `'${intentCandidates[0].intent}' 관련 문의가 맞나요, 아니면 '${intentCandidates[1].intent}' 쪽이 더 가까운가요?`)
    : null;

  return {
    query,
    locale: isEnglishLocale(locale) ? 'en' : 'ko',
    predicted_intent: predictedIntent,
    confidence,
    route_source: 'keyword',
    model_predicted_intent: predictedIntent,
    model_confidence: confidence,
    intent_candidates: intentCandidates,
    needs_clarification: score <= 0,
    clarification_question: clarificationQuestion,
    documents: docs,
  };
};
