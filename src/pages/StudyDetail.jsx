import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, FileText, Lock } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';
import { studyTopics } from '../lib/studyData';
import PremiumBadge from '@/components/PremiumBadge';
import ConceptTag from '../components/study/ConceptTag';

const isPlaceholderPdfUrl = (pdfUrl) => !pdfUrl || pdfUrl.includes('media.example.com');

export default function StudyDetail() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const [tab, setTab] = useState('summary');
  const [isPremium, setIsPremium] = useState(false);
  const topic = studyTopics.find(t => t.id === topicId);

  useEffect(() => {
    const checkPremium = async () => {
      const user = await getCurrentUser().catch(() => null);
      setIsPremium(getIsPremium(user));
    };
    checkPremium();
  }, []);

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <p className="text-muted-foreground text-[15px]">주제를 찾을 수 없습니다</p>
        <Link to="/" className="text-primary font-semibold text-[14px] mt-4">돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-[13px] font-medium mb-5 transition-colors outline-none">
        <ArrowLeft className="w-4 h-4" />
        학습 목록
      </button>

      {/* Title */}
      <div className="mb-5">
        <div className="text-3xl mb-2">{topic.icon}</div>
        <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-1">{topic.subtitle}</p>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-foreground leading-snug">
            {topic.title}
          </h1>
          {isPremium && <PremiumBadge compact />}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 mb-6 bg-muted p-1 rounded-xl">
        <button
          onClick={() => setTab('summary')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            tab === 'summary'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          요약 정리
        </button>
        <button
          onClick={() => !isPremium ? null : setTab('pdf')}
          disabled={!isPremium}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
            tab === 'pdf'
              ? 'bg-card text-foreground shadow-sm'
              : !isPremium
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          원문 PDF
          {!isPremium && <Lock className="w-3 h-3" />}
        </button>
      </div>

      {tab === 'summary' ? (
        <div className="space-y-6">
          {/* Summary intro */}
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
            <p className="text-[13px] text-foreground leading-relaxed">{topic.summary}</p>
          </div>

          {/* Goals */}
          <section>
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-3">🎯 학습 목표</h2>
            <div className="space-y-2">
              {topic.goals.map((goal, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-xl border border-border px-4 py-3">
                  <span className="text-primary font-bold text-[13px] flex-shrink-0">{i + 1}</span>
                  <p className="text-[13px] text-foreground leading-relaxed">{goal}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Key concepts */}
          <section>
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-3">📚 핵심 개념</h2>
            <div className="space-y-2">
              {topic.concepts.map((concept, i) => (
                <ConceptTag key={i} concept={concept} />
              ))}
            </div>
          </section>

          {/* Learning points */}
          <section>
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-3">📖 학습 내용</h2>
            <div className="space-y-3">
              {topic.learningPoints.map((point, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                    <span className="text-lg">{point.emoji}</span>
                    <h4 className="font-bold text-[14px] text-foreground">{point.title}</h4>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line">{point.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : !isPremium ? (
        <div className="rounded-2xl border border-border overflow-hidden bg-muted/50 flex items-center justify-center" style={{ height: '80vh' }}>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Lock className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">프리미엄 기능입니다</h3>
            <p className="text-muted-foreground text-[14px] mb-6">원문 PDF는 프리미엄 구독자만 볼 수 있어요</p>
            <Link to="/premium" className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-[13px]">
              프리미엄 시작하기
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card" style={{ height: '80vh' }}>
          {!topic.pdfUrl || isPlaceholderPdfUrl(topic.pdfUrl) ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-[16px] font-bold text-foreground">원문 PDF 링크를 아직 실제 파일로 연결하지 않았어요</p>
              <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                현재 학습 데이터의 `pdfUrl`이 예시 주소(`media.example.com`)로 들어가 있어서, 프리미엄이어도 PDF가 열리지 않습니다.
                실제 공개 PDF URL이나 Supabase Storage 공개 링크로 교체하면 바로 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="h-full">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                <p className="text-[12px] font-semibold text-foreground">프리미엄 원문 PDF</p>
                <a
                  href={topic.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground"
                >
                  새 탭에서 열기
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <iframe
                src={topic.pdfUrl}
                className="h-[calc(80vh-49px)] w-full"
                title={topic.title + ' PDF'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
