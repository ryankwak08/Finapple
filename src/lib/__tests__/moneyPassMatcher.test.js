import { describe, expect, it } from 'vitest';
import { buildMoneyPassProfileQuery } from '../moneyPassMl.js';
import { getMoneyPassFamilyCenters, getMoneyPassRecommendations, normalizeMoneyPassProfile } from '../moneyPassMatcher.js';

describe('Money Pass natural-language profile', () => {
  it('uses free-form user context as semantic-search query text', () => {
    const profile = normalizeMoneyPassProfile({
      age: 24,
      city: '성남시',
      employmentStatus: '미취업',
      naturalLanguage: '수원시에 사는 27살 취준생이고 월세 자취 중이라 보증금 대출이 궁금해요.',
    });

    const query = buildMoneyPassProfileQuery(profile);

    expect(query).toContain('보증금 대출');
    expect(profile.city).toBe('수원시');
    expect(profile.age).toBe(27);
    expect(profile.employmentStatus).toBe('취업준비');
    expect(profile.housingCostType).toBe('월세');
    expect(profile.livingArrangement).toBe('자취/독립');
    expect(profile.interests).toEqual(expect.arrayContaining(['금융', '취업']));
  });

  it('extracts monthly income hints from natural language', () => {
    const profile = normalizeMoneyPassProfile({
      age: 30,
      naturalLanguage: '중소기업 재직 중이고 월소득 250만원 정도예요.',
    });

    expect(profile.employmentStatus).toBe('중소기업 재직');
    expect(profile.monthlyIncome).toBe(2500000);
  });

  it('ranks interview support above generic local youth policies when requested', () => {
    const [first] = getMoneyPassRecommendations({
      age: 24,
      city: '용인시',
      employmentStatus: '취업준비',
      householdSize: 1,
      monthlyIncome: 0,
      livingArrangement: '가족과 거주',
      housingCostType: '월세',
      naturalLanguage: '면접 지원정책이 궁금해요',
    });

    expect(first.title).toContain('면접');
  });

  it('does not recommend housing dormitory policies for earning-money requests', () => {
    const recommendations = getMoneyPassRecommendations({
      age: 24,
      city: '용인시',
      employmentStatus: '취업준비',
      householdSize: 1,
      monthlyIncome: 0,
      livingArrangement: '가족과 거주',
      housingCostType: '월세',
      naturalLanguage: '돈을 벌고 싶어요',
    });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.map((policy) => policy.title).join(' ')).not.toContain('기숙사');
    expect(recommendations.every((policy) => (
      (policy.categories || []).includes('employment') || (policy.categories || []).includes('startup')
    ))).toBe(true);
  });

  it('keeps multicultural-only policies for multicultural family profiles', () => {
    const recommendations = getMoneyPassRecommendations({
      age: 24,
      city: '양평군',
      householdSize: 3,
      employmentStatus: '미취업',
      specialStatus: '다문화 가족',
      naturalLanguage: '다문화 가족 지원이 궁금해요',
    }, { limit: 20 });

    expect(recommendations.some((policy) => policy.title.includes('다문화'))).toBe(true);
  });

  it('infers multicultural family status from natural language', () => {
    const profile = normalizeMoneyPassProfile({
      age: 28,
      naturalLanguage: '다문화가정이고 한국어 교육이나 가족센터 지원을 알고 싶어요.',
    });

    expect(profile.specialStatus).toBe('다문화 가족');
    expect(profile.interests).toContain('다문화');
  });

  it('shows local multicultural family centers for multicultural profiles', () => {
    const centers = getMoneyPassFamilyCenters({
      city: '용인시',
      specialStatus: '다문화 가족',
    });

    expect(centers[0]).toMatchObject({
      city: '용인시',
      name: '용인시가족센터',
      phone: '031-321-7131',
    });
  });

  it('hides multicultural family centers for unrelated profiles', () => {
    const centers = getMoneyPassFamilyCenters({
      city: '용인시',
      specialStatus: '',
    });

    expect(centers).toEqual([]);
  });
});
