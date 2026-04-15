import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const courses = [
  {
    id: 'youth',
    emoji: '🧑',
    title: '청년기 편',
    titleEn: 'Young Adult Track',
    subtitle: 'KDI 생애주기 경제교육',
    subtitleEn: 'KDI life-stage economics course',
    description: '사회초년생을 위한 실용 금융 지식\n합리적 소비·신용카드·부채 관리',
    descriptionEn: 'Practical money skills for young adults\nSmart spending, credit cards, and debt management',
    available: true,
    badge: '현재 수록',
    badgeEn: 'Available now',
  },
  {
    id: 'teen',
    emoji: '🧒',
    title: '청소년기 편',
    titleEn: 'Teen Track',
    subtitle: 'KDI 생애주기 경제교육',
    subtitleEn: 'KDI life-stage economics course',
    description: '청소년을 위한 금융 기초와 생활경제\n용돈관리·노동권·진로 설계',
    descriptionEn: 'Finance basics for teens and everyday economics\nAllowance management, labor rights, and career planning',
    available: true,
    badge: '현재 수록',
    badgeEn: 'Available now',
  },
];

export default function CourseSelector({ type, onSelect }) {
  const { isEnglish } = useLanguage();
  const renderedCourses = courses;

  return (
    <div className="px-4 pb-6 pt-8 sm:px-5 sm:pt-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-1 text-[26px] font-extrabold tracking-tight text-foreground sm:text-3xl">
          {type === 'study'
            ? (isEnglish ? 'Learning' : '학습')
            : (isEnglish ? 'Quiz' : '퀴즈')}
        </h1>
        <p className="text-muted-foreground text-[14px]">{isEnglish ? 'Choose a course to continue.' : '학습할 과목을 선택하세요'}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {renderedCourses.map((course, i) => (
          <button
            key={course.id}
            onClick={() => {
              if (!course.available) return;
              onSelect(course.id);
            }}
            disabled={!course.available}
            className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 animate-slide-up sm:p-5 ${
              course.available
                ? 'bg-card border-border hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]'
                : 'bg-muted/30 border-border/50 opacity-60'
            }`}
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="mt-0.5 text-[30px] sm:text-3xl">{course.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-bold text-foreground sm:text-base">{isEnglish ? course.titleEn : course.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    course.available
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isEnglish ? course.badgeEn : course.badge}
                  </span>
                </div>
                <p className="mb-1 text-[12px] text-muted-foreground">{isEnglish ? course.subtitleEn : course.subtitle}</p>
                <p className="whitespace-pre-line text-[12px] leading-relaxed text-muted-foreground/70">
                  {isEnglish ? course.descriptionEn : course.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 mt-1 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
