import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function TopicCard({ topic, index, course, variant = 'default' }) {
  const { isEnglish } = useLanguage();
  const to = course ? `/study/${topic.id}?course=${course}` : `/study/${topic.id}`;
  const isIssue = topic.category === '세계 이슈';
  const hasCoverImage = Boolean(topic.coverImage);
  const previewSlides = topic.cardNews?.length ? topic.cardNews : hasCoverImage ? [{ src: topic.coverImage }] : [];
  const [previewIndex, setPreviewIndex] = useState(0);
  const categoryLabel = isIssue
    ? (isEnglish ? 'Global issue' : '세계 이슈')
    : (isEnglish ? 'Everyday finance' : '금융 상식');
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  useEffect(() => {
    if (!isIssue || previewSlides.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPreviewIndex((current) => (current + 1) % previewSlides.length);
    }, 2400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isIssue, previewSlides.length]);

  return (
    <Link
      to={to}
      className="block animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`rounded-[28px] border p-4 transition-all duration-300 active:scale-[0.985] sm:p-5 ${
        isIssue
          ? 'border-orange-200 bg-gradient-to-br from-orange-50 via-amber-100 to-rose-50 hover:shadow-lg hover:shadow-orange-200/70'
          : 'border-border bg-card hover:shadow-lg hover:shadow-primary/5'
      } ${isCompact ? 'p-3.5 sm:p-4' : ''}`}>
        {isIssue && hasCoverImage && !isCompact ? (
          <div className="mb-4 overflow-hidden rounded-[22px] border border-orange-200 bg-white/90 shadow-[0_12px_30px_-24px_rgba(234,88,12,0.45)]">
            <div className={`relative w-full overflow-hidden ${isHero ? 'aspect-[21/9]' : 'aspect-[16/9]'}`}>
              <div
                className="flex h-full w-full transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${previewIndex * 100}%)` }}
              >
                {previewSlides.map((slide, slideIndex) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt={isEnglish ? `${topic.title} card preview ${slideIndex + 1}` : `${topic.title} 카드뉴스 미리보기 ${slideIndex + 1}`}
                    className="h-full w-full shrink-0 object-cover"
                    loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-900/10 to-transparent" />
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/88 px-2.5 py-1 shadow-sm">
                {previewSlides.map((slide, slideIndex) => (
                  <span
                    key={slide.src}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      slideIndex === previewIndex ? 'w-4 bg-orange-500' : 'w-1.5 bg-orange-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isIssue && hasCoverImage && isCompact ? (
          <div className="mb-3 overflow-hidden rounded-2xl border border-orange-200 bg-white/90 shadow-[0_10px_26px_-24px_rgba(234,88,12,0.55)]">
            <div className="relative aspect-[16/6] w-full overflow-hidden">
              <img
                src={previewSlides[0].src}
                alt={isEnglish ? `${topic.title} card preview` : `${topic.title} 카드뉴스 미리보기`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-slate-950/10" />
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {topic.category ? (
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${
              isIssue ? 'bg-orange-500 text-white' : 'bg-primary/10 text-primary'
            }`}>
              {categoryLabel}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            {topic.updatedAt ? <span>{topic.updatedAt}</span> : null}
            {topic.readTime ? <span>{topic.readTime}</span> : null}
          </div>
        </div>

        <div className={`flex items-start gap-3 sm:gap-4 ${isCompact ? 'gap-2.5 sm:gap-3' : ''}`}>
          <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[30px] sm:text-3xl ${
            isIssue ? 'bg-white/80' : 'bg-primary/5'
          } ${isCompact ? 'h-10 w-10 text-2xl sm:h-11 sm:w-11' : ''}`}>{topic.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold leading-snug text-foreground ${isCompact ? 'text-[14px] sm:text-[15px]' : 'text-[15px] sm:text-base'}`}>
              {topic.title}
            </h3>
            <p className={`mt-1 leading-relaxed text-muted-foreground ${isCompact ? 'text-[12px]' : 'text-[13px]'}`}>
              {topic.subtitle}
            </p>
            <p className={`mt-2 line-clamp-2 leading-relaxed text-muted-foreground/70 ${isCompact ? 'text-[11px]' : 'text-[12px]'}`}>
              {topic.summary}
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 mt-1 flex-shrink-0 ${
            isIssue ? 'text-orange-500/70' : 'text-muted-foreground/40'
          }`} />
        </div>
      </div>
    </Link>
  );
}
