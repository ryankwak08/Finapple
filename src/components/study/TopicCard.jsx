import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function TopicCard({ topic, index, course }) {
  const to = course ? `/study/${topic.id}?course=${course}` : `/study/${topic.id}`;
  const isIssue = topic.category === '세계 이슈';
  const hasCoverImage = Boolean(topic.coverImage);
  const previewSlides = topic.cardNews?.length ? topic.cardNews : hasCoverImage ? [{ src: topic.coverImage }] : [];
  const [previewIndex, setPreviewIndex] = useState(0);

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
      }`}>
        {isIssue && hasCoverImage ? (
          <div className="mb-4 overflow-hidden rounded-[22px] border border-orange-200 bg-white/90 shadow-[0_12px_30px_-24px_rgba(234,88,12,0.45)]">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <div
                className="flex h-full w-full transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${previewIndex * 100}%)` }}
              >
                {previewSlides.map((slide, slideIndex) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt={`${topic.title} 카드뉴스 미리보기 ${slideIndex + 1}`}
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

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {topic.category ? (
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${
              isIssue ? 'bg-orange-500 text-white' : 'bg-primary/10 text-primary'
            }`}>
              {topic.category}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            {topic.updatedAt ? <span>{topic.updatedAt}</span> : null}
            {topic.readTime ? <span>{topic.readTime}</span> : null}
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[30px] sm:text-3xl ${
            isIssue ? 'bg-white/80' : 'bg-primary/5'
          }`}>{topic.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold leading-snug text-foreground sm:text-base">
              {topic.title}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {topic.subtitle}
            </p>
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/70">
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
