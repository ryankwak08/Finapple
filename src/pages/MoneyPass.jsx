import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  FileCheck2,
  Landmark,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  getIncomePercent,
  getMoneyPassFamilyCenters,
  getMedianIncomeThresholds,
  getMoneyPassInternCenters,
  getMoneyPassJobPostings,
  getMoneyPassRecommendations,
  moneyPassCities,
} from '@/lib/moneyPassMatcher.js';
import { moneyPassDataSource } from '@/lib/moneyPassData.js';
import { useLanguage } from '@/lib/i18n';

const DEFAULT_PROFILE = {
  age: 24,
  city: '성남시',
  gender: '',
  householdSize: 1,
  monthlyIncome: '',
  employmentStatus: '미취업',
  livingArrangement: '자취/독립',
  housingCostType: '월세',
  specialStatus: '',
  interests: [],
  naturalLanguage: '',
};

const employmentOptions = ['미취업', '취업준비', '대학생', '재직', '중소기업 재직', '창업준비'];
const householdOptions = [1, 2, 3, 4, 5, 6];
const livingOptions = ['가족과 거주', '자취/독립', '기숙사', '신혼부부', '기타'];
const housingCostOptions = ['월세', '전세', '보증부 월세', '자가', '무상 거주', '확인 필요'];
const specialStatusOptions = ['', '다문화 가족'];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SegmentedButtons({ value, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl border px-3 py-2 text-[12px] font-bold transition ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function SpecialStatusButtons({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {specialStatusOptions.map((option) => {
        const label = option || '해당 없음';
        const selected = value === option;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-xl border px-3 py-2 text-[12px] font-bold transition ${
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/40'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function scoreTone(score) {
  if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 70) return 'text-sky-700 bg-sky-50 border-sky-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
}

function formatWon(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function applicationStatusLabel(status) {
  return ({
    open: '접수 중',
    upcoming: '예정',
    always: '상시',
    closed: '마감',
    unknown: '확인 필요',
  })[status] || '';
}

function documentTypeLabel(type) {
  return ({
    required: '필수',
    conditional: '조건부',
    optional: '선택',
    unknown: '확인',
  })[type] || type;
}

function buildPolicyDocumentQuestion(policy) {
  return [
    `정책ID: ${policy.id}`,
    `정책명: ${policy.title}`,
    '이 정책 하나에 대해서만 신청 준비 서류, 조건부 서류, 발급처, 다음 단계를 알려줘.',
    '다른 정책은 추천하거나 섞어서 설명하지 말아줘.',
  ].join('\n');
}

export default function MoneyPass() {
  const { isEnglish } = useLanguage();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const recommendations = useMemo(() => getMoneyPassRecommendations(profile, { limit: 8 }), [profile]);
  const familyCenters = useMemo(() => getMoneyPassFamilyCenters(profile, { limit: 3 }), [profile]);
  const internCenters = useMemo(() => getMoneyPassInternCenters(profile, { limit: 5 }), [profile]);
  const jobPostings = useMemo(() => getMoneyPassJobPostings(profile, { limit: 5 }), [profile]);
  const incomePercent = useMemo(() => getIncomePercent(profile), [profile]);
  const incomeThresholds = useMemo(() => getMedianIncomeThresholds(profile.householdSize), [profile.householdSize]);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-xl px-1 py-1 text-[12px] font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {isEnglish ? 'Back to finance study' : '금융 상식으로 돌아가기'}
        </Link>
      </div>

      <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">Finapple AI</p>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight text-emerald-950 sm:text-3xl">Finapple AI</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-emerald-900/85">
              경기도 공공서비스 데이터를 AI 점수와 조건 점수로 분석해, 지금 내 상황에 가까운 청년 금융·취업·주거 정책을 추천해요.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[260px]">
            <div className="rounded-xl border border-emerald-200 bg-white/75 px-2 py-3">
              <p className="text-[18px] font-black text-emerald-950">{moneyPassDataSource.publicServicesSelectedRows}</p>
              <p className="text-[10px] font-bold text-emerald-700">정책 데이터</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/75 px-2 py-3">
              <p className="text-[18px] font-black text-emerald-950">{moneyPassDataSource.youthProgramsTotalRows}</p>
              <p className="text-[10px] font-bold text-emerald-700">청년사업</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white/75 px-2 py-3">
              <p className="text-[18px] font-black text-emerald-950">{moneyPassDataSource.jobPostingsSelectedRows}</p>
              <p className="text-[10px] font-bold text-emerald-700">채용 샘플</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-extrabold text-foreground">내 조건 입력</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <Field label="나이">
                <input
                  type="number"
                  min="13"
                  max="80"
                  value={profile.age}
                  onChange={(event) => setProfile((current) => ({ ...current, age: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] font-bold outline-none focus:border-primary"
                />
              </Field>
              <Field label="거주 시군">
                <select
                  value={profile.city}
                  onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] font-bold outline-none focus:border-primary"
                >
                  {moneyPassCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="취업 상태">
              <SegmentedButtons
                value={profile.employmentStatus}
                options={employmentOptions}
                onChange={(value) => setProfile((current) => ({ ...current, employmentStatus: value }))}
              />
            </Field>

            <div className="grid grid-cols-[96px_1fr] gap-3">
              <Field label="가구원 수">
                <select
                  value={profile.householdSize}
                  onChange={(event) => setProfile((current) => ({ ...current, householdSize: Number(event.target.value) }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] font-bold outline-none focus:border-primary"
                >
                  {householdOptions.map((size) => (
                    <option key={size} value={size}>{size}인</option>
                  ))}
                </select>
              </Field>
              <Field label="월소득">
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={profile.monthlyIncome}
                  onChange={(event) => setProfile((current) => ({ ...current, monthlyIncome: event.target.value }))}
                  placeholder="예: 2500000"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-[13px] font-bold outline-none focus:border-primary"
                />
              </Field>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              <p className="text-[11px] font-bold text-sky-900">
                {profile.householdSize}인 가구 기준 중위소득 100%는 월 {formatWon(incomeThresholds[100])}
              </p>
              <p className="mt-1 text-[10px] leading-5 text-sky-800/80">
                120% {formatWon(incomeThresholds[120])} · 150% {formatWon(incomeThresholds[150])} · 180% {formatWon(incomeThresholds[180])}
                {incomePercent ? ` · 내 소득은 약 ${incomePercent}%` : ' · 소득을 입력하면 자동 계산'}
              </p>
            </div>

            <Field label="거주 형태">
              <SegmentedButtons
                value={profile.livingArrangement}
                options={livingOptions}
                onChange={(value) => setProfile((current) => ({ ...current, livingArrangement: value }))}
              />
            </Field>

            <Field label="계약/비용 형태">
              <SegmentedButtons
                value={profile.housingCostType}
                options={housingCostOptions}
                onChange={(value) => setProfile((current) => ({ ...current, housingCostType: value }))}
              />
            </Field>

            <Field label="해당 사항">
              <SpecialStatusButtons
                value={profile.specialStatus}
                onChange={(value) => setProfile((current) => ({ ...current, specialStatus: value }))}
              />
            </Field>

            <Field label="내 상황">
              <textarea
                value={profile.naturalLanguage}
                onChange={(event) => setProfile((current) => ({ ...current, naturalLanguage: event.target.value }))}
                rows={4}
                maxLength={500}
                placeholder="예: 성남시에 사는 24살 취준생이고 월세 자취 중이에요. 보증금 대출이나 면접 지원 정책이 궁금해요."
                className="min-h-[104px] w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-[13px] font-semibold leading-6 outline-none focus:border-primary"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">AI Recommendations</p>
                <h2 className="mt-1 text-[17px] font-extrabold text-foreground">추천 정책 {recommendations.length}개</h2>
              </div>
            </div>

            <div className="space-y-3">
              {recommendations.map((policy, index) => (
                <article key={policy.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">#{index + 1}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${scoreTone(policy.matchScore)}`}>
                          총점 {policy.matchScore}
                        </span>
                        <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold text-muted-foreground">
                          의미 점수 {policy.mlScore}
                        </span>
                        {policy.applicationStatus ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-800">
                            {applicationStatusLabel(policy.applicationStatus)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-[15px] font-extrabold leading-snug text-foreground">{policy.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                        <Landmark className="h-3.5 w-3.5" />
                        {policy.agency}
                        {policy.supportType ? <span>· {policy.supportType}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        to={`/finance-chat?query=${encodeURIComponent(buildPolicyDocumentQuestion(policy))}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        AI에게 서류 물어보기
                      </Link>
                      <a
                        href={policy.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-[11px] font-bold text-foreground hover:border-primary/40"
                      >
                        공식 링크
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  <p className="mt-3 text-[13px] leading-6 text-foreground">{policy.description}</p>
                  {policy.benefitSummary || policy.benefitAmount ? (
                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-[11px] leading-5 text-sky-950">
                      {policy.benefitSummary ? <p><span className="font-black">혜택</span><br />{policy.benefitSummary}</p> : null}
                      {policy.benefitAmount ? <p className="mt-2"><span className="font-black">금액/방식</span><br />{policy.benefitAmount}</p> : null}
                    </div>
                  ) : null}
                  {policy.eligibility || policy.announcementPeriod || policy.applicationMethod ? (
                    <div className="mt-3 grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] leading-5 text-emerald-950 sm:grid-cols-3">
                      {policy.eligibility ? <p><span className="font-black">대상</span><br />{policy.eligibility}</p> : null}
                      {policy.announcementPeriod ? <p><span className="font-black">공고</span><br />{policy.announcementPeriod}</p> : null}
                      {policy.applicationMethod ? <p><span className="font-black">신청</span><br />{policy.applicationMethod}</p> : null}
                    </div>
                  ) : null}
                  {policy.documents?.length ? (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-foreground">
                        <FileCheck2 className="h-3.5 w-3.5 text-sky-600" />
                        제출 서류
                      </p>
                      <div className="space-y-1.5">
                        {policy.documents.slice(0, 4).map((document) => (
                          <p key={`${policy.id}-${document.name}-${document.condition}`} className="text-[11px] leading-5 text-muted-foreground">
                            <span className="font-black text-foreground">{document.name}</span>
                            {document.type ? <span> · {documentTypeLabel(document.type)}</span> : null}
                            {document.condition ? <span> · {document.condition}</span> : null}
                            {document.issuer ? <span> · {document.issuer}</span> : null}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {policy.importantWarnings || policy.commonRejectionReasons ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
                      {policy.importantWarnings ? <p><span className="font-black">주의</span><br />{policy.importantWarnings}</p> : null}
                      {policy.commonRejectionReasons ? <p className="mt-2"><span className="font-black">탈락 사유</span><br />{policy.commonRejectionReasons}</p> : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {policy.categoryLabels.map((label) => (
                      <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{label}</span>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-border bg-card px-3 py-2">
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black text-foreground">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                      추천 이유
                    </p>
                    <p className="text-[12px] leading-5 text-muted-foreground">{policy.matchReasons.join(' · ')}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {familyCenters.length ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-[15px] font-extrabold text-foreground">다문화 가족지원센터</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {familyCenters.map((center) => (
                  <article key={center.id} className="rounded-2xl border border-border bg-background p-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      {center.name}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-muted-foreground">{center.city} · {center.phone}</p>
                    <p className="mt-2 flex gap-1.5 text-[11px] leading-5 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {center.roadAddress || center.lotAddress}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-sky-600" />
              <h2 className="text-[15px] font-extrabold text-foreground">근처 청년취업인턴제 운영기관</h2>
            </div>
            {internCenters.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {internCenters.map((center) => (
                  <article key={center.id} className="rounded-2xl border border-border bg-background p-3">
                    <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground">
                      <Building2 className="h-4 w-4 text-sky-600" />
                      {center.name}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-muted-foreground">{center.employmentCenter} 고용센터 · {center.phone}</p>
                    <p className="mt-2 flex gap-1.5 text-[11px] leading-5 text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {center.roadAddress || center.lotAddress}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                이 시군의 인턴 운영기관 데이터는 아직 없어요. 경기도 공통 취업 정책을 먼저 확인해보세요.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-emerald-600" />
              <h2 className="text-[15px] font-extrabold text-foreground">잡아바 접수 중 채용</h2>
            </div>
            {jobPostings.length ? (
              <div className="space-y-3">
                {jobPostings.map((job) => (
                  <article key={job.id} className="rounded-2xl border border-border bg-background p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[13px] font-extrabold text-foreground">{job.title}</p>
                        <p className="mt-1 text-[11px] font-bold text-muted-foreground">{job.company} · {job.city} · {job.career} · {job.education}</p>
                      </div>
                      <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-[11px] font-bold text-foreground">
                        공고
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{job.field || '분야 미분류'} · {job.salary || '급여 확인 필요'} · 마감 {job.closeDate}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
                이 시군의 접수 중 채용 샘플은 아직 없어요. 취업지원기관과 경기도 공통 취업정책을 먼저 확인해보세요.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
