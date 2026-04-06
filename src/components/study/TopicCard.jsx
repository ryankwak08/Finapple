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
      <div className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 active:scale-[0.98]">
        <div className="flex items-start gap-4">
          <div className="text-3xl mt-0.5">{topic.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-[15px] leading-snug">
              {topic.title}
            </h3>
            <p className="text-muted-foreground text-[13px] mt-1 leading-relaxed">
              {topic.subtitle}
            </p>
            <p className="text-muted-foreground/70 text-[12px] mt-2 line-clamp-2 leading-relaxed">
              {topic.summary}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 mt-1 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
