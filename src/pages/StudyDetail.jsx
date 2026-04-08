import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { getStudyTopicById } from '../lib/studyData';
import { getQuizUnitCatalogByStudyTopicId } from '../lib/quizCatalog';
import ConceptTag from '../components/study/ConceptTag';
import ConsumptionHabitTest from '../components/study/ConsumptionHabitTest';
import InvestmentProfileTest from '../components/study/InvestmentProfileTest';

const TOSS_FEED_SOURCE_URL = 'https://toss.im/tossfeed';
const TOSS_FEED_TOPIC_IDS = new Set([
  'housing-support-2026',
  'youth-policy-2026',
  'year-end-tax-settlement-2026',
]);

const buildSummaryBullets = (topic) => {
  return (topic.summary || '')
    .split(/(?<=[.!?।]|다\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

export default function StudyDetail() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const [showSummary, setShowSummary] = useState(false);
  const [showSourceViewer, setShowSourceViewer] = useState(false);
  const topic = getStudyTopicById(topicId);
  const linkedUnit = getQuizUnitCatalogByStudyTopicId(topicId);
  const summaryBullets = useMemo(() => (topic ? buildSummaryBullets(topic) : []), [topic]);
  const sourceMeta = useMemo(() => {
    if (!topic) {
      return null;
    }

    if (TOSS_FEED_TOPIC_IDS.has(topic.id)) {
      return {
        label: '출처: Toss Feed',
        url: TOSS_FEED_SOURCE_URL,
      };
    }

    return {
      label: '출처: 한국개발연구원(KDI) 「생애주기별 경제교육(청년기 편)」',
      url: '',
    };
  }, [topic]);

  if (!topic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <p className="text-[15px] text-muted-foreground">주제를 찾을 수 없습니다</p>
        <Link to="/" className="mt-4 text-[14px] font-semibold text-primary">돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-8 sm:px-5 sm:pt-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        학습 목록
      </button>

      <div className="mb-5">
        <div className="mb-2 text-3xl">{topic.icon}</div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-primary">{topic.subtitle}</p>
        <h1 className="text-xl font-extrabold leading-snug text-foreground sm:text-2xl">
          {topic.title}
        </h1>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-[13px] leading-relaxed text-foreground">{topic.summary}</p>
        <button
          type="button"
          onClick={() => setShowSummary((current) => !current)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-background px-3 py-2 text-[13px] font-bold text-primary transition-colors hover:bg-primary/5"
        >
          <BookOpen className="h-4 w-4" />
          요약 정리
          {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showSummary ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">요약 정리</h2>
          <div className="space-y-2">
            {summaryBullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <span className="mt-0.5 text-[13px] font-bold text-primary">•</span>
                <p className="text-[13px] leading-relaxed text-foreground">{bullet}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {topic.pdfUrl ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">원문 자료</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">{sourceMeta?.label}</p>
              {sourceMeta?.url ? (
                <a
                  href={sourceMeta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  원문 출처 보기
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setShowSourceViewer((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted"
            >
              {showSourceViewer ? '원문 닫기' : '원문 보기'}
            </button>
          </div>
          {showSourceViewer ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <iframe
                src={`${topic.pdfUrl}#view=FitH`}
                title={`${topic.title} 원문 PDF`}
                className="h-[70vh] w-full min-h-[480px]"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {topic.cardNews?.length ? (
        <section className="mb-6 rounded-[28px] border border-orange-200 bg-orange-50 p-4 shadow-[0_18px_40px_-28px_rgba(234,88,12,0.22)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">Card News</p>
              <h2 className="mt-1 text-[18px] font-extrabold text-slate-900">슬라이드로 보는 이슈 핵심</h2>
            </div>
            <div className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-orange-700 shadow-sm">
              총 {topic.cardNews.length}장
            </div>
          </div>
          <div className="rounded-[26px] bg-orange-50 px-2 py-2.5">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {topic.cardNews.map((slide, index) => (
              <article
                key={slide.src}
                className="min-w-[88%] snap-center overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-[0_16px_36px_-24px_rgba(234,88,12,0.45)] sm:min-w-[420px]"
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="w-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </article>
            ))}
            </div>
          </div>
        </section>
      ) : null}

      {topic.goals?.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">학습 목표</h2>
          <div className="space-y-2">
            {topic.goals.map((goal, index) => (
              <div key={goal} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="mt-0.5 text-[11px] font-black text-primary">{index + 1}</span>
                <p className="text-[13px] leading-relaxed text-foreground">{goal}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {topic.learningPoints?.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">학습 내용</h2>
          <div className="space-y-3">
            {topic.learningPoints.map((point) => (
              <article key={point.title} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-3">
                  <span className="text-lg">{point.emoji || '📘'}</span>
                  <h3 className="text-[14px] font-bold text-foreground">{point.title}</h3>
                </div>
                <div className="px-4 py-3">
                  {point.title === '내 소비습관 진단하기' ? (
                    <ConsumptionHabitTest />
                  ) : point.title === '나의 투자성향 파악하기' ? (
                    <InvestmentProfileTest />
                  ) : (
                    <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                      {point.content}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {topic.concepts?.length ? (
        <section className="mb-6">
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">핵심 개념</h2>
          <div className="space-y-2">
            {topic.concepts.map((concept, index) => (
              <ConceptTag key={`${concept.term}-${index}`} concept={concept} />
            ))}
          </div>
        </section>
      ) : null}

      {linkedUnit ? (
        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-primary">읽고 바로 퀴즈 풀기</h2>
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-foreground">
            이 주제는 퀴즈 단원과 연결되어 있어요. 각 퀴즈에 들어가면 이 학습 내용을 잘게 나눈 뒤 바로 문제를 풀게 됩니다.
          </p>
          <div className="grid gap-2">
            {linkedUnit.quizzes.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{quiz.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{quiz.subtitle}</p>
                </div>
                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
