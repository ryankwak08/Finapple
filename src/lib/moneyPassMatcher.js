import { moneyPassInternCenters, moneyPassJobPostings, moneyPassPublicServices } from './moneyPassData.js';
import { createMoneyPassTfIdfModel, scoreMoneyPassPoliciesWithMl } from './moneyPassMl.js';

const CATEGORY_LABELS = {
  youth: '청년',
  employment: '취업/구직',
  housing: '주거',
  finance: '금융',
  startup: '창업',
  education: '교육/자격',
  welfare: '복지/상담',
};

const EMPLOYMENT_KEYWORDS = ['취업', '구직', '면접', '일자리', '인턴', '자격', '시험', '역량', '훈련'];
const WORKER_KEYWORDS = ['노동자', '재직', '근로', '일자리', '금융', '통장', '대출', '신용'];
const HOUSING_KEYWORDS = ['주거', '전세', '월세', '보증금', '주택', '이사비', '임차', '임대'];
const STARTUP_KEYWORDS = ['창업', '소상공인', '예비창업', '초기창업'];
const FINANCE_RISK_KEYWORDS = ['대출', '신용', '이자', '보증', '융자', '학자금', '통장'];
const INCOME_LIMIT_PATTERNS = [
  { pattern: /중위소득\s*50%|중위\s*50%/, limit: 50 },
  { pattern: /중위소득\s*100%|중위\s*100%/, limit: 100 },
  { pattern: /중위소득\s*120%|중위\s*120%/, limit: 120 },
  { pattern: /중위소득\s*150%|중위\s*150%/, limit: 150 },
  { pattern: /중위소득\s*180%|중위\s*180%/, limit: 180 },
];
const RECOMMENDATION_DATE = new Date(2026, 4, 26);

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));
const normalizeText = (value) => String(value || '').trim();
const moneyPassTfIdfModel = createMoneyPassTfIdfModel(moneyPassPublicServices);

export const moneyPassCities = Array.from(new Set([
  ...moneyPassPublicServices.map((item) => item.city).filter(Boolean),
  ...moneyPassInternCenters.map((item) => item.city).filter(Boolean),
])).sort((a, b) => a.localeCompare(b, 'ko'));

export function normalizeMoneyPassProfile(profile = {}) {
  const householdSize = Math.min(7, Math.max(1, Number(profile.householdSize || 1)));
  const monthlyIncome = Number(profile.monthlyIncome || 0);
  const housingCostType = normalizeText(profile.housingCostType || profile.housingStatus);
  const livingArrangement = normalizeText(profile.livingArrangement || '');
  const housingStatus = normalizeText(profile.housingStatus || housingCostType || livingArrangement);

  return {
    age: Number(profile.age || 0),
    city: normalizeText(profile.city),
    gender: normalizeText(profile.gender),
    householdSize,
    monthlyIncome,
    employmentStatus: normalizeText(profile.employmentStatus || '미취업'),
    incomeRange: normalizeText(profile.incomeRange),
    livingArrangement,
    housingCostType,
    housingStatus,
    interests: Array.isArray(profile.interests) ? profile.interests.map(normalizeText).filter(Boolean) : [],
  };
}

export const medianIncome2026 = {
  1: 2564238,
  2: 4199292,
  3: 5359036,
  4: 6494738,
  5: 7556719,
  6: 8555952,
  7: 9515150,
};

export function getIncomePercent(profileInput = {}) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const baseIncome = medianIncome2026[profile.householdSize] || medianIncome2026[1];
  if (!profile.monthlyIncome || profile.monthlyIncome <= 0) return 0;
  return Math.round((profile.monthlyIncome / baseIncome) * 1000) / 10;
}

export function getMedianIncomeThresholds(householdSize = 1) {
  const size = Math.min(7, Math.max(1, Number(householdSize || 1)));
  const baseIncome = medianIncome2026[size] || medianIncome2026[1];
  return {
    householdSize: size,
    50: Math.round(baseIncome * 0.5),
    100: baseIncome,
    120: Math.round(baseIncome * 1.2),
    150: Math.round(baseIncome * 1.5),
    180: Math.round(baseIncome * 1.8),
  };
}

function getPolicyIncomeLimit(policy) {
  const text = `${policy.title} ${policy.description} ${policy.eligibility || ''}`;
  const match = INCOME_LIMIT_PATTERNS.find(({ pattern }) => pattern.test(text));
  return match?.limit || null;
}

function scorePolicy(policy, profile) {
  const categories = new Set(policy.categories || []);
  const text = `${policy.title} ${policy.description} ${policy.supportType}`;
  const reasons = [];
  let score = 0;

  if (profile.age >= 19 && profile.age <= 39 && categories.has('youth')) {
    score += 30;
    reasons.push('청년 연령대와 맞는 정책');
  }

  if (profile.city && policy.city === profile.city) {
    score += 28;
    reasons.push(`${profile.city} 지역 정책`);
  } else if (policy.city === '경기도') {
    score += 14;
    reasons.push('경기도 공통 정책');
  }

  if (['미취업', '취업준비', '대학생'].includes(profile.employmentStatus) && includesAny(text, EMPLOYMENT_KEYWORDS)) {
    score += 20;
    reasons.push('취업 준비 상황과 연결');
  }

  if (['재직', '중소기업 재직', '근로자'].includes(profile.employmentStatus) && includesAny(text, WORKER_KEYWORDS)) {
    score += 18;
    reasons.push('재직 청년에게 유용');
  }

  if (['전세', '월세', '자취', '1인가구'].includes(profile.housingStatus) && includesAny(text, HOUSING_KEYWORDS)) {
    score += 20;
    reasons.push(`${profile.housingStatus} 거주 부담 완화와 연결`);
  }

  if (['전세', '월세', '보증부 월세'].includes(profile.housingCostType) && includesAny(text, HOUSING_KEYWORDS)) {
    score += 20;
    reasons.push(`${profile.housingCostType} 계약/비용 부담과 연결`);
  }

  const incomeLimit = getPolicyIncomeLimit(policy);
  const incomePercent = getIncomePercent(profile);
  if (incomeLimit && incomePercent > 0) {
    if (incomePercent <= incomeLimit) {
      score += 16;
      reasons.push(`월소득 기준 중위소득 ${incomePercent}%로 ${incomeLimit}% 이하 조건에 가까움`);
    } else if (incomePercent <= incomeLimit + 20) {
      score += 4;
      reasons.push(`소득 조건은 추가 확인 필요`);
    }
  }

  if (profile.interests.includes('창업') && includesAny(text, STARTUP_KEYWORDS)) {
    score += 18;
    reasons.push('창업 관심사와 연결');
  }

  if (profile.interests.includes('금융') && includesAny(text, FINANCE_RISK_KEYWORDS)) {
    score += 14;
    reasons.push('금융 의사결정과 연결');
  }

  if (categories.has('finance')) score += 6;
  if (categories.has('housing')) score += 5;
  if (categories.has('employment')) score += 4;

  return { score, reasons: Array.from(new Set(reasons)) };
}

function isAvailableForCity(policy, profile) {
  if (!profile.city) return true;
  if (!policy.city || policy.city === '경기도') return true;
  return policy.city === profile.city;
}

function passesSpecialEligibility(policy, profile) {
  const text = `${policy.title} ${policy.description} ${policy.eligibility || ''}`;
  const interests = new Set(profile.interests);
  const cityExcluded = profile.city ? new RegExp(`${profile.city}.{0,30}제외`).test(text) : false;

  if (profile.city && (
    cityExcluded ||
    text.includes(`${profile.city} 제외`) ||
    text.includes(`${profile.city}는 자체사업`) ||
    text.includes(`${profile.city} 자체사업`)
  )) return false;
  if (text.includes('여성') && profile.gender !== '여성' && !interests.has('여성')) return false;
  if (includesAny(text, ['다자녀', '출산', '산모', '신생아', '임산부']) && !interests.has('출산/양육')) return false;
  if (text.includes('신혼부부') && !interests.has('신혼부부')) return false;
  if (includesAny(text, ['학교 밖 청소년', '가정 밖 청소년']) && profile.age > 19) return false;
  if (includesAny(text, ['어르신', '노인', '고령자']) && profile.age < 60) return false;
  if (text.includes('귀농') && !interests.has('농업')) return false;
  if (text.includes('북한이탈') && !interests.has('북한이탈주민')) return false;
  if (includesAny(text, ['기업 인증', '고용환경개선', '우수기업']) && !interests.has('기업지원')) return false;

  return true;
}

function parseMonthDay(month, day = 1) {
  const parsedMonth = Number(month);
  const parsedDay = Number(day || 1);
  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) return null;
  return new Date(2026, parsedMonth - 1, parsedDay || 1);
}

function extractScheduleDates(value) {
  const text = normalizeText(value);
  if (!text || includesAny(text, ['상시', '수시', '연중'])) return ['always'];

  const dates = [];
  const monthDayMatches = text.matchAll(/(\d{1,2})\s*(?:월|\.)\s*(\d{1,2})?/g);
  for (const match of monthDayMatches) {
    const date = parseMonthDay(match[1], match[2] || 1);
    if (date) dates.push(date);
  }

  const monthOnlyMatches = text.matchAll(/(\d{1,2})월/g);
  for (const match of monthOnlyMatches) {
    const date = parseMonthDay(match[1], 1);
    if (date) dates.push(date);
  }

  return dates;
}

function isOpenOrUpcomingPolicy(policy) {
  if (!policy.announcementPeriod) return true;
  const dates = extractScheduleDates(policy.announcementPeriod);
  if (!dates.length || dates.includes('always')) return true;

  return dates.some((date) => {
    if (!(date instanceof Date)) return true;
    const endOfMonth = new Date(2026, date.getMonth() + 1, 0);
    return date >= RECOMMENDATION_DATE || endOfMonth >= RECOMMENDATION_DATE;
  });
}

export function getMoneyPassRecommendations(profileInput = {}, options = {}) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const limit = options.limit || 8;
  const mlWeight = Number.isFinite(options.mlWeight) ? options.mlWeight : 45;
  const eligiblePolicies = moneyPassPublicServices
    .filter((policy) => isAvailableForCity(policy, profile))
    .filter((policy) => passesSpecialEligibility(policy, profile))
    .filter(isOpenOrUpcomingPolicy);
  const mlScores = scoreMoneyPassPoliciesWithMl(moneyPassTfIdfModel, profile, eligiblePolicies);

  return eligiblePolicies
    .map((policy) => {
      const result = scorePolicy(policy, profile);
      const mlSimilarity = mlScores.get(policy.id) || 0;
      const mlScore = Math.round(mlSimilarity * mlWeight * 100) / 100;
      const reasons = [...result.reasons];
      return {
        ...policy,
        categoryLabels: (policy.categories || []).map((category) => CATEGORY_LABELS[category] || category),
        ruleScore: result.score,
        mlSimilarity,
        mlScore,
        matchScore: Math.round((result.score + mlScore) * 100) / 100,
        matchReasons: Array.from(new Set(reasons)),
      };
    })
    .filter((policy) => policy.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title, 'ko'))
    .slice(0, limit);
}

export function getMoneyPassInternCenters(profileInput = {}, options = {}) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const limit = options.limit || 5;
  const centers = profile.city
    ? moneyPassInternCenters.filter((center) => center.city === profile.city)
    : moneyPassInternCenters;

  return centers.slice(0, limit);
}

export function getMoneyPassJobPostings(profileInput = {}, options = {}) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const limit = options.limit || 6;
  if (!['미취업', '취업준비', '대학생', '재직'].includes(profile.employmentStatus)) {
    return [];
  }

  const cityJobs = profile.city
    ? moneyPassJobPostings.filter((job) => job.city === profile.city)
    : moneyPassJobPostings;

  return cityJobs
    .sort((a, b) => {
      const aFresh = a.career === '무관' || a.career === '신입' || a.career === '신입/경력' ? 0 : 1;
      const bFresh = b.career === '무관' || b.career === '신입' || b.career === '신입/경력' ? 0 : 1;
      return aFresh - bFresh || a.closeDate.localeCompare(b.closeDate) || a.title.localeCompare(b.title, 'ko');
    })
    .slice(0, limit);
}

export function buildMoneyPassChatPrompt(profileInput = {}, recommendations = []) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const incomePercent = getIncomePercent(profile);
  const policyLines = recommendations
    .slice(0, 5)
    .map((policy) => `- ${policy.title} (${policy.agency})`)
    .join('\n');

  return [
    `${profile.city || '경기도'}에 사는 ${profile.age || '청년'}세 청년이야.`,
    `취업 상태는 ${profile.employmentStatus || '미입력'}, 월소득은 ${profile.monthlyIncome ? `${profile.monthlyIncome.toLocaleString('ko-KR')}원` : '미입력'}${incomePercent ? `(기준 중위소득 약 ${incomePercent}%)` : ''}이야.`,
    `거주 형태는 ${profile.livingArrangement || '미입력'}, 계약/비용 형태는 ${profile.housingCostType || '미입력'}이야.`,
    '아래 경기도 공공데이터 기반 추천 정책에 대해 신청 가능성, 준비 서류, 마감 확인 방법, 조심해야 할 금융 선택을 설명해줘.',
    policyLines,
  ].filter(Boolean).join('\n');
}
