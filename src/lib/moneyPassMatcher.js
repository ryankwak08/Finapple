import { moneyPassInternCenters, moneyPassJobPostings, moneyPassPublicServices } from './moneyPassData.js';
import { moneyPassFamilyCenters } from './moneyPassFamilyCenters.js';
import { moneyPassPolicyMaster } from './moneyPassPolicyMaster.js';
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
const MULTICULTURAL_KEYWORDS = ['다문화', '외국인', '이주배경', '결혼이민', '가족센터', '한국어', '통번역'];
const NATURAL_QUERY_INTENTS = [
  {
    name: '소득/일자리 지원',
    queryKeywords: ['돈 벌', '돈을 벌', '벌고 싶', '수입', '알바', '부업', '일하고 싶', '일자리', '일 구', '취업하고', '취직'],
    policyKeywords: ['취업', '구직', '일자리', '인턴', '채용', '직무', '역량', '훈련', '자격', '시험', '면접', '근로', '노동자', '창업'],
    excludedPolicyKeywords: ['기숙사', '학사', '학자금', '장학', '주거', '월세', '전세', '보증금', '기본소득', '신용회복'],
    categories: ['employment', 'startup'],
    strict: true,
    requireCategory: true,
  },
  {
    name: '면접 지원',
    queryKeywords: ['면접', '면접지원', '면접 지원', '면접수당', '면접 정장', '정장 대여', '이력서 사진', '취업사진'],
    policyKeywords: ['면접', '면접수당', '면접정장', '정장', '이력서', '취업사진', '헤어', '메이크업'],
    categories: ['employment'],
    strict: true,
    requireCategory: true,
  },
  {
    name: '월세 지원',
    queryKeywords: ['월세'],
    policyKeywords: ['월세', '임차료', '월 임차료'],
    excludedPolicyKeywords: ['기숙사', '학사'],
    categories: ['housing'],
    strict: true,
    requireCategory: true,
  },
  {
    name: '취업 지원',
    queryKeywords: ['취업', '취준', '구직', '일자리', '인턴'],
    policyKeywords: ['취업', '구직', '일자리', '인턴', '직무', '역량', '교육훈련'],
    categories: ['employment'],
  },
  {
    name: '주거 지원',
    queryKeywords: ['월세', '전세', '보증금', '주거', '자취', '기숙사', '이사비'],
    policyKeywords: ['월세', '전세', '보증금', '주거', '주택', '기숙사', '이사비', '임차'],
    categories: ['housing'],
    strict: true,
    requireCategory: true,
  },
  {
    name: '금융 지원',
    queryKeywords: ['대출', '신용', '이자', '저축', '통장', '청년도약'],
    policyKeywords: ['대출', '신용', '이자', '저축', '통장', '금융', '상환'],
    categories: ['finance'],
    strict: true,
    requireCategory: true,
  },
  {
    name: '창업 지원',
    queryKeywords: ['창업', '사업', '가게', '소상공인'],
    policyKeywords: ['창업', '사업', '소상공인', '사업자', '판로'],
    categories: ['startup'],
  },
  {
    name: '다문화 가족 지원',
    queryKeywords: ['다문화', '외국인 배우자', '결혼이민', '이주배경', '가족센터', '한국어 교육', '통번역'],
    policyKeywords: MULTICULTURAL_KEYWORDS,
    categories: [],
    strict: true,
  },
];
const NATURAL_PROFILE_HINTS = [
  { field: 'employmentStatus', value: '중소기업 재직', keywords: ['중소기업 재직', '중소기업에 다니', '중소기업 근무'] },
  { field: 'employmentStatus', value: '창업준비', keywords: ['창업 준비', '예비창업', '사업 준비', '가게 준비'] },
  { field: 'employmentStatus', value: '취업준비', keywords: ['취업 준비', '취준', '구직', '면접 준비', '일자리 찾'] },
  { field: 'employmentStatus', value: '대학생', keywords: ['대학생', '재학생', '휴학생', '학자금'] },
  { field: 'employmentStatus', value: '재직', keywords: ['재직', '직장인', '회사 다니', '근로자', '월급'] },
  { field: 'employmentStatus', value: '미취업', keywords: ['미취업', '무직', '일을 쉬', '소득이 없'] },
  { field: 'housingCostType', value: '보증부 월세', keywords: ['보증부 월세', '반전세'] },
  { field: 'housingCostType', value: '월세', keywords: ['월세', '월세방'] },
  { field: 'housingCostType', value: '전세', keywords: ['전세', '전셋집', '전세자금'] },
  { field: 'housingCostType', value: '자가', keywords: ['자가', '내 집'] },
  { field: 'livingArrangement', value: '자취/독립', keywords: ['자취', '독립해서', '혼자 살', '1인 가구', '원룸'] },
  { field: 'livingArrangement', value: '신혼부부', keywords: ['신혼', '배우자', '결혼'] },
  { field: 'livingArrangement', value: '기숙사', keywords: ['기숙사'] },
  { field: 'livingArrangement', value: '가족과 거주', keywords: ['부모님과', '가족과', '본가'] },
  { field: 'specialStatus', value: '다문화 가족', keywords: ['다문화', '외국인 배우자', '결혼이민', '이주배경', '다문화가정'] },
];
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
const supplementalPublicServices = moneyPassPublicServices.filter((policy) => (
  includesAny(`${policy.title} ${policy.description} ${policy.eligibility || ''}`, MULTICULTURAL_KEYWORDS)
));
const moneyPassRecommendationPolicies = [
  ...moneyPassPolicyMaster,
  ...supplementalPublicServices.filter((policy) => !moneyPassPolicyMaster.some((masterPolicy) => masterPolicy.id === policy.id)),
];
const moneyPassTfIdfModel = createMoneyPassTfIdfModel(moneyPassRecommendationPolicies);

function policySearchText(policy) {
  return [
    policy.title,
    policy.description,
    policy.supportType,
    policy.eligibility,
    policy.benefitSummary,
    policy.benefitAmount,
    policy.employmentRequirement,
    policy.importantWarnings,
  ].filter(Boolean).join(' ');
}

function getNaturalQueryIntents(profile) {
  const text = normalizeText(profile.naturalLanguage);
  if (!text) return [];
  return NATURAL_QUERY_INTENTS.filter((intent) => includesAny(text, intent.queryKeywords));
}

function passesNaturalIntentFilter(policy, profile) {
  const strictIntents = getNaturalQueryIntents(profile).filter((intent) => intent.strict);
  if (!strictIntents.length) return true;
  const text = policySearchText(policy);
  const categories = new Set(policy.categories || []);
  return strictIntents.every((intent) => {
    const hasDirectMatch = includesAny(text, intent.policyKeywords);
    const hasCategoryMatch = intent.categories.some((category) => categories.has(category));
    const hasExcludedMatch = intent.excludedPolicyKeywords?.length
      ? includesAny(text, intent.excludedPolicyKeywords)
      : false;
    return hasDirectMatch && !hasExcludedMatch && (!intent.requireCategory || hasCategoryMatch);
  });
}

function extractCityFromNaturalLanguage(text) {
  if (!text) return '';
  const cities = Array.from(new Set([
    ...moneyPassPublicServices.map((item) => item.city).filter(Boolean),
    ...moneyPassInternCenters.map((item) => item.city).filter(Boolean),
  ]));
  return cities.find((city) => text.includes(city) || text.includes(city.replace(/시$|군$/, ''))) || '';
}

function extractAgeFromNaturalLanguage(text) {
  const match = text.match(/(\d{2})\s*(?:살|세)/);
  if (!match) return 0;
  const age = Number(match[1]);
  return age >= 13 && age <= 80 ? age : 0;
}

function extractMonthlyIncomeFromNaturalLanguage(text) {
  const incomeMatch = text.match(/(?:월소득|월급|소득|수입|월)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(만원|원)?/);
  if (!incomeMatch) return 0;
  const amount = Number(incomeMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return incomeMatch[2] === '원' ? Math.round(amount) : Math.round(amount * 10000);
}

function inferInterestsFromNaturalLanguage(text, currentInterests = []) {
  const interests = new Set(currentInterests);
  [
    { value: '금융', keywords: ['금융', '대출', '신용', '이자', '저축', '통장', '청년도약'] },
    { value: '취업', keywords: ['취업', '취준', '구직', '면접', '일자리', '인턴', '자격증'] },
    { value: '창업', keywords: ['창업', '사업', '가게', '소상공인'] },
    { value: '신혼부부', keywords: ['신혼', '결혼', '배우자'] },
    { value: '출산/양육', keywords: ['출산', '육아', '아이', '자녀', '임산부'] },
    { value: '여성', keywords: ['여성', '여자'] },
    { value: '다문화', keywords: ['다문화', '외국인 배우자', '결혼이민', '이주배경', '다문화가정'] },
  ].forEach(({ value, keywords }) => {
    if (includesAny(text, keywords)) interests.add(value);
  });
  return Array.from(interests);
}

function applyNaturalLanguageHints(profile) {
  const text = normalizeText(profile.naturalLanguage);
  if (!text) return profile;

  const hinted = { ...profile };
  const city = extractCityFromNaturalLanguage(text);
  if (city) hinted.city = city;
  const age = extractAgeFromNaturalLanguage(text);
  if (age) hinted.age = age;
  const monthlyIncome = extractMonthlyIncomeFromNaturalLanguage(text);
  if (monthlyIncome) hinted.monthlyIncome = monthlyIncome;

  const appliedFields = new Set();
  NATURAL_PROFILE_HINTS.forEach(({ field, value, keywords }) => {
    if (!appliedFields.has(field) && includesAny(text, keywords)) {
      hinted[field] = value;
      appliedFields.add(field);
    }
  });

  hinted.housingStatus = hinted.housingCostType || hinted.livingArrangement || hinted.housingStatus;
  hinted.interests = inferInterestsFromNaturalLanguage(text, hinted.interests);
  if (hinted.specialStatus === '다문화 가족' && !hinted.interests.includes('다문화')) {
    hinted.interests = [...hinted.interests, '다문화'];
  }
  return hinted;
}

export const moneyPassCities = Array.from(new Set([
  ...moneyPassPolicyMaster.map((item) => item.city).filter(Boolean),
  ...moneyPassPublicServices.map((item) => item.city).filter(Boolean),
  ...moneyPassInternCenters.map((item) => item.city).filter(Boolean),
  ...moneyPassFamilyCenters.map((item) => item.city).filter(Boolean),
])).sort((a, b) => a.localeCompare(b, 'ko'));

export function normalizeMoneyPassProfile(profile = {}) {
  const householdSize = Math.min(7, Math.max(1, Number(profile.householdSize || 1)));
  const monthlyIncome = Number(profile.monthlyIncome || 0);
  const housingCostType = normalizeText(profile.housingCostType || profile.housingStatus);
  const livingArrangement = normalizeText(profile.livingArrangement || '');
  const housingStatus = normalizeText(profile.housingStatus || housingCostType || livingArrangement);
  const specialStatus = normalizeText(profile.specialStatus || '');
  const interests = Array.isArray(profile.interests) ? profile.interests.map(normalizeText).filter(Boolean) : [];
  if (specialStatus === '다문화 가족' && !interests.includes('다문화')) {
    interests.push('다문화');
  }

  return applyNaturalLanguageHints({
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
    specialStatus,
    interests,
    naturalLanguage: normalizeText(profile.naturalLanguage || profile.situationText || ''),
  });
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
  const text = policySearchText(policy);
  const naturalIntents = getNaturalQueryIntents(profile);
  const reasons = [];
  let score = 0;

  if (policy.sourceType === 'policy_master') {
    score += 12;
    reasons.push('검수된 정책 마스터 데이터');
  }

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

  if (profile.interests.includes('다문화') && includesAny(text, MULTICULTURAL_KEYWORDS)) {
    score += 42;
    reasons.push('다문화 가족 상태와 연결');
  }

  naturalIntents.forEach((intent) => {
    const hasDirectMatch = includesAny(text, intent.policyKeywords);
    const hasTitleMatch = includesAny(policy.title || '', intent.policyKeywords);
    const hasCategoryMatch = intent.categories.some((category) => categories.has(category));
    if (hasTitleMatch) {
      score += 86;
      reasons.push(`${intent.name} 제목과 직접 연결`);
    } else if (hasDirectMatch) {
      score += 56;
      reasons.push(`${intent.name} 표현과 직접 연결`);
    } else if (hasCategoryMatch) {
      score += 10;
      reasons.push(`${intent.name} 분야와 연결`);
    } else {
      score -= 28;
    }
  });

  if (categories.has('finance')) score += 6;
  if (categories.has('housing')) score += 5;
  if (categories.has('employment')) score += 4;

  return { score, reasons: Array.from(new Set(reasons)) };
}

function isAvailableForCity(policy, profile) {
  if (!profile.city) return true;
  if ((policy.excludedCities || []).includes(profile.city)) return false;
  if (!policy.city || policy.city === '경기도') return true;
  return policy.city === profile.city;
}

function passesSpecialEligibility(policy, profile) {
  const text = `${policy.title} ${policy.description} ${policy.eligibility || ''}`;
  const interests = new Set(profile.interests);
  const cityExcluded = profile.city ? new RegExp(`${profile.city}.{0,30}제외`).test(text) : false;
  const workerOnly = includesAny(text, ['재직자', '재직 청년', '근로자', '노동자', '중소기업 재직', '중소기업 노동자']);

  if (profile.city && (
    cityExcluded ||
    (policy.excludedCities || []).includes(profile.city) ||
    text.includes(`${profile.city} 제외`) ||
    text.includes(`${profile.city}는 자체사업`) ||
    text.includes(`${profile.city} 자체사업`)
  )) return false;
  if (workerOnly && !['재직', '중소기업 재직', '근로자'].includes(profile.employmentStatus)) return false;
  if (policy.ageMin && profile.age && profile.age < policy.ageMin) return false;
  if (policy.ageMax && profile.age && profile.age > policy.ageMax) return false;
  if (text.includes('여성') && profile.gender !== '여성' && !interests.has('여성')) return false;
  if (includesAny(text, ['다자녀', '출산', '산모', '신생아', '임산부']) && !interests.has('출산/양육')) return false;
  if (text.includes('신혼부부') && !interests.has('신혼부부')) return false;
  if (text.includes('다문화') && !interests.has('다문화')) return false;
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
  if (policy.applicationStatus === 'closed') return false;
  if (['open', 'upcoming', 'always'].includes(policy.applicationStatus)) return true;
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
  const eligiblePolicies = moneyPassRecommendationPolicies
    .filter((policy) => isAvailableForCity(policy, profile))
    .filter((policy) => passesSpecialEligibility(policy, profile))
    .filter((policy) => passesNaturalIntentFilter(policy, profile))
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

export function getMoneyPassFamilyCenters(profileInput = {}, options = {}) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const limit = options.limit || 3;
  if (!profile.interests.includes('다문화')) {
    return [];
  }

  const sameCityCenters = profile.city
    ? moneyPassFamilyCenters.filter((center) => center.city === profile.city)
    : [];
  const fallbackCenters = moneyPassFamilyCenters.filter((center) => center.city !== profile.city);
  return [...sameCityCenters, ...fallbackCenters].slice(0, limit);
}

export function buildMoneyPassChatPrompt(profileInput = {}, recommendations = []) {
  const profile = normalizeMoneyPassProfile(profileInput);
  const incomePercent = getIncomePercent(profile);
  const policyLines = recommendations
    .slice(0, 5)
    .map((policy) => {
      const documents = (policy.documents || [])
        .slice(0, 6)
        .map((document) => `${document.name}${document.type ? `(${document.type})` : ''}${document.condition ? `-${document.condition}` : ''}`)
        .join(', ');
      return [
        `- ${policy.title} (${policy.agency})`,
        policy.applicationStatus ? `  신청상태: ${policy.applicationStatus}` : '',
        policy.announcementPeriod ? `  신청기간: ${policy.announcementPeriod}` : '',
        policy.eligibility ? `  대상조건: ${policy.eligibility}` : '',
        policy.benefitAmount ? `  혜택: ${policy.benefitAmount}` : '',
        documents ? `  제출서류: ${documents}` : '',
        policy.importantWarnings ? `  주의사항: ${policy.importantWarnings}` : '',
        policy.commonRejectionReasons ? `  탈락사유: ${policy.commonRejectionReasons}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n');

  return [
    `${profile.city || '경기도'}에 사는 ${profile.age || '청년'}세 청년이야.`,
    `취업 상태는 ${profile.employmentStatus || '미입력'}, 월소득은 ${profile.monthlyIncome ? `${profile.monthlyIncome.toLocaleString('ko-KR')}원` : '미입력'}${incomePercent ? `(기준 중위소득 약 ${incomePercent}%)` : ''}이야.`,
    `거주 형태는 ${profile.livingArrangement || '미입력'}, 계약/비용 형태는 ${profile.housingCostType || '미입력'}이야.`,
    profile.specialStatus ? `해당 사항은 ${profile.specialStatus}이야.` : '',
    '아래 경기도 공공데이터 기반 추천 정책에 대해 신청 가능성, 준비 서류, 마감 확인 방법, 조심해야 할 금융 선택을 설명해줘.',
    policyLines,
  ].filter(Boolean).join('\n');
}
