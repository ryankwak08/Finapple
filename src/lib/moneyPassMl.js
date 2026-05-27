const KOREAN_CHUNK_SIZE = 2;
const MAX_FEATURES = 1800;
const PROFILE_EXPANSIONS = {
  미취업: ['취업', '구직', '면접', '일자리', '자격', '시험', '역량'],
  취업준비: ['취업', '구직', '면접', '일자리', '자격', '시험', '역량'],
  대학생: ['청년', '취업', '자격', '시험', '학자금', '교육'],
  재직: ['노동자', '근로', '통장', '금융', '대출', '신용'],
  '중소기업 재직': ['노동자', '근로', '통장', '금융', '일자리'],
  전세: ['주거', '전세', '보증금', '대출', '이자', '보증'],
  월세: ['주거', '월세', '임차', '주택', '이사비', '지원'],
  자취: ['주거', '월세', '임차', '주택', '이사비', '지원'],
  금융: ['금융', '대출', '신용', '이자', '통장', '저축', '보증'],
  창업: ['창업', '소상공인', '예비창업', '초기창업', '교육'],
  취업: ['취업', '구직', '면접', '일자리', '인턴', '자격', '시험'],
  다문화: ['다문화', '외국인', '이주배경', '가족센터', '한국어', '통번역'],
  '다문화 가족': ['다문화', '외국인', '이주배경', '가족센터', '한국어', '통번역'],
};

const STOPWORDS = new Set([
  '경기도',
  '지원',
  '서비스',
  '사업',
  '대상',
  '제공',
  '위한',
  '에게',
  '관내',
  '현금',
  '기타',
]);

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s·/-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function koreanChunks(token) {
  if (!/[가-힣]/.test(token) || token.length <= KOREAN_CHUNK_SIZE) {
    return [];
  }

  const chunks = [];
  for (let index = 0; index <= token.length - KOREAN_CHUNK_SIZE; index += 1) {
    chunks.push(token.slice(index, index + KOREAN_CHUNK_SIZE));
  }
  return chunks;
}

export function tokenizeMoneyPassText(text) {
  return normalize(text)
    .split(' ')
    .flatMap((token) => {
      if (!token || STOPWORDS.has(token)) return [];
      return [token, ...koreanChunks(token)];
    })
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function termCounts(tokens) {
  const counts = new Map();
  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return counts;
}

function dotProduct(a, b) {
  let score = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  small.forEach((value, key) => {
    score += value * (large.get(key) || 0);
  });
  return score;
}

function vectorNorm(vector) {
  let sum = 0;
  vector.forEach((value) => {
    sum += value * value;
  });
  return Math.sqrt(sum) || 1;
}

function vectorize(tokens, vocabulary, idf) {
  const counts = termCounts(tokens);
  const vector = new Map();
  counts.forEach((count, token) => {
    if (!vocabulary.has(token)) return;
    vector.set(token, (1 + Math.log(count)) * (idf.get(token) || 1));
  });
  return vector;
}

function policyText(policy) {
  return [
    policy.title,
    policy.description,
    policy.supportType,
    policy.agency,
    policy.city,
    ...(policy.categoryLabels || []),
    ...(policy.categories || []),
  ].filter(Boolean).join(' ');
}

export function createMoneyPassTfIdfModel(policies) {
  const documents = policies.map((policy) => tokenizeMoneyPassText(policyText(policy)));
  const documentFrequency = new Map();

  documents.forEach((tokens) => {
    new Set(tokens).forEach((token) => {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    });
  });

  const vocabulary = new Set(
    Array.from(documentFrequency.entries())
      .filter(([, frequency]) => frequency > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_FEATURES)
      .map(([token]) => token),
  );
  const documentCount = Math.max(1, documents.length);
  const idf = new Map();
  vocabulary.forEach((token) => {
    const frequency = documentFrequency.get(token) || 0;
    idf.set(token, Math.log((1 + documentCount) / (1 + frequency)) + 1);
  });

  const policyVectors = documents.map((tokens, index) => {
    const vector = vectorize(tokens, vocabulary, idf);
    return {
      policy: policies[index],
      vector,
      norm: vectorNorm(vector),
    };
  });

  return { vocabulary, idf, policyVectors };
}

export function buildMoneyPassProfileQuery(profile) {
  const parts = [
    profile.naturalLanguage,
    `${profile.age || ''}세 청년`,
    profile.city,
    profile.gender,
    profile.employmentStatus,
    profile.incomeRange,
    profile.monthlyIncome ? `월소득 ${profile.monthlyIncome}` : '',
    profile.livingArrangement,
    profile.housingCostType,
    profile.housingStatus,
    profile.specialStatus,
    ...(profile.interests || []),
  ].filter(Boolean);

  [
    profile.employmentStatus,
    profile.livingArrangement,
    profile.housingCostType,
    profile.housingStatus,
    profile.specialStatus,
    ...(profile.interests || []),
  ].forEach((key) => {
    if (PROFILE_EXPANSIONS[key]) {
      parts.push(...PROFILE_EXPANSIONS[key]);
    }
  });

  return parts.join(' ');
}

export function scoreMoneyPassPoliciesWithMl(model, profile, policies) {
  const queryTokens = tokenizeMoneyPassText(buildMoneyPassProfileQuery(profile));
  const queryVector = vectorize(queryTokens, model.vocabulary, model.idf);
  const queryNorm = vectorNorm(queryVector);
  const allowedIds = new Set(policies.map((policy) => policy.id));

  return new Map(
    model.policyVectors
      .filter(({ policy }) => allowedIds.has(policy.id))
      .map(({ policy, vector, norm }) => {
        const cosine = dotProduct(queryVector, vector) / (queryNorm * norm);
        return [policy.id, Number.isFinite(cosine) ? cosine : 0];
      }),
  );
}
