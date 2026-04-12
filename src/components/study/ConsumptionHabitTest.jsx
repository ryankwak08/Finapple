import { useLanguage } from '@/lib/i18n';

export default function ConsumptionHabitTest() {
  const { isEnglish } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
      <p className="text-[13px] font-bold text-foreground">
        {isEnglish ? 'Self-diagnosis content is being updated' : '소비 습관 자가진단 콘텐츠 업데이트 중'}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        {isEnglish
          ? 'This section is temporarily hidden while we prepare a new proprietary curriculum.'
          : '신규 자체 커리큘럼 준비를 위해 해당 테스트는 임시로 비공개 처리되었습니다.'}
      </p>
    </div>
  );
}
