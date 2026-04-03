export default function LearningSection({ point, index }) {
  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary text-[12px] font-bold">{index + 1}</span>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[14px] text-foreground leading-snug">
              {point.title}
            </h4>
            <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed whitespace-pre-line">
              {point.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}