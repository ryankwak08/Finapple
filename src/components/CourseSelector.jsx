import { ChevronRight, Lock } from 'lucide-react';

const courses = [
  {
    id: 'youth',
    emoji: '🧑',
    title: '청년기 편',
    subtitle: 'KDI 청소년 경제교육',
    description: '사회초년생을 위한 실용 금융 지식\n합리적 소비·신용카드·부채 관리',
    available: true,
    badge: '현재 수록',
  },
  {
    id: 'economy-basics',
    emoji: '📊',
    title: '경제 기초 편',
    subtitle: '거시경제·금융 개념',
    description: 'GDP, 금리, 환율 등 경제 기본 원리',
    available: false,
    badge: '준비 중',
  },
  {
    id: 'investment',
    emoji: '💹',
    title: '투자 편',
    subtitle: '주식·채권·펀드',
    description: '다양한 금융상품과 투자 전략 이해',
    available: false,
    badge: '준비 중',
  },
];

export default function CourseSelector({ type, onSelect }) {
  return (
    <div className="px-5 pt-14 pb-4">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-1">
          {type === 'study' ? '학습' : '퀴즈'}
        </h1>
        <p className="text-muted-foreground text-[14px]">학습할 과목을 선택하세요</p>
      </div>

      <div className="space-y-4">
        {courses.map((course, i) => (
          <button
            key={course.id}
            onClick={() => {
              if (!course.available) return;
              onSelect(course.id);
            }}
            disabled={!course.available}
            className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 animate-slide-up ${
              course.available
                ? 'bg-card border-border hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]'
                : 'bg-muted/30 border-border/50 opacity-60'
            }`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-start gap-4">
              <div className={`text-3xl mt-0.5`}>{course.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-foreground text-[15px]">{course.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    course.available
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {course.badge}
                  </span>
                </div>
                <p className="text-muted-foreground text-[12px] mb-1">{course.subtitle}</p>
                <p className="text-muted-foreground/70 text-[12px] whitespace-pre-line leading-relaxed">
                  {course.description}
                </p>
              </div>
              {course.available ? (
                <ChevronRight className="w-5 h-5 text-muted-foreground/40 mt-1 flex-shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground/30 mt-1 flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
