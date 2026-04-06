import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function TopicCard({ topic, index, course }) {
  const to = course ? `/study/${topic.id}?course=${course}` : `/study/${topic.id}`;
  return (
    <Link
      to={to}
      className="block animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className="rounded-2xl border border-border bg-card p-4 transition-all duration-300 active:scale-[0.985] hover:shadow-lg hover:shadow-primary/5 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="mt-0.5 text-[30px] sm:text-3xl">{topic.icon}</div>
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
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 mt-1 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
