import { Heart } from 'lucide-react';

export default function HeartDisplay({ hearts, maxHearts = 5, unlimited = false }) {
  const visibleHearts = unlimited ? maxHearts : hearts;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          className={`w-5 h-5 transition-all duration-300 ${
            i < visibleHearts
              ? 'text-red-400 fill-red-400'
              : 'text-muted-foreground/20 fill-muted-foreground/10'
          }`}
          strokeWidth={2}
        />
      ))}
      {unlimited && (
        <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          ∞ 무제한
        </span>
      )}
    </div>
  );
}
