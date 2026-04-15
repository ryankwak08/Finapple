import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function TopicCard({ topic, index, course, variant = 'default' }) {
  const { isEnglish } = useLanguage();
  const to = course ? `/study/${topic.id}?course=${course}` : `/study/${topic.id}`;
  const isIssue = topic.category === '세계 이슈';
  const categoryLabel = isIssue
    ? (isEnglish ? 'Global issue' : '세계 이슈')
    : (isEnglish ? 'Everyday finance' : '금융 상식');
  const isCompact = variant === 'compact';

  return (
    <Link
      to={to}
      className="block animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`rounded-2xl border p-4 transition-all duration-300 active:scale-[0.985] sm:p-5 ${
        isIssue
          ? 'border-orange-200 bg-orange-50 hover:shadow-md hover:shadow-orange-200/50'
          : 'border-border bg-card hover:shadow-lg hover:shadow-primary/5'
      } ${isCompact ? 'p-3.5 sm:p-4' : ''}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {topic.category ? (
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${
              isIssue ? 'bg-orange-500 text-white' : 'bg-primary/10 text-primary'
            }`}>
              {categoryLabel}
            </span>
          ) : null}
          {topic.badge ? (
            <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] text-foreground/80">
              {topic.badge}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            {topic.updatedAt ? <span>{topic.updatedAt}</span> : null}
            {topic.readTime ? <span>{topic.readTime}</span> : null}
          </div>
        </div>

        <div className={`flex items-start gap-3 sm:gap-4 ${isCompact ? 'gap-2.5 sm:gap-3' : ''}`}>
          <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[30px] sm:text-3xl ${
            isIssue ? 'bg-white' : 'bg-primary/5'
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
