export const COURSES = {
  youth: {
    id: 'youth',
    title: '청년기 편',
    titleEn: 'Young Adult Track',
    sourceLabel: '출처: 한국개발연구원(KDI) 「생애주기별 경제교육(청년기 편)」',
    sourceLabelEn: 'Source: KDI Life-stage Economics Education (Young Adult)',
    sourceUrl: 'https://eiec.kdi.re.kr/material/lifeList.do?pp=20&pg=1&life_gubun=c&svalue=',
    curriculumCompleteTitle: 'KDI 청년기 생애주기 경제교육',
    curriculumCompleteTitleEn: 'KDI Young Adult Economics Course',
    curriculumCompleteSummary: '합리적 소비부터 노후 준비까지,\n청년 경제 생활에 필요한 모든 것을 배웠어요.',
    curriculumCompleteSummaryEn: 'From smart spending to retirement basics,\nyou finished the essentials of young adult money life.',
  },
  teen: {
    id: 'teen',
    title: '청소년기 편',
    titleEn: 'Teen Track',
    sourceLabel: '출처: 한국개발연구원(KDI) 「생애주기별 경제교육(청소년기 편)」',
    sourceLabelEn: 'Source: KDI Life-stage Economics Education (Teen)',
    sourceUrl: 'https://eiec.kdi.re.kr/material/lifeList.do?pp=20&pg=1&life_gubun=b&svalue=',
    curriculumCompleteTitle: 'KDI 청소년기 생애주기 경제교육',
    curriculumCompleteTitleEn: 'KDI Teen Economics Course',
    curriculumCompleteSummary: '소비와 용돈관리부터 노동권과 진로 설계까지,\n청소년 경제 생활의 핵심을 완주했어요.',
    curriculumCompleteSummaryEn: 'From spending and allowance planning to labor rights and career design,\nyou completed the key teen money lessons.',
  },
};

export function getCourseMeta(course = 'youth') {
  return COURSES[course] || COURSES.youth;
}
