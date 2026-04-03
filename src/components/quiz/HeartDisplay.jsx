import { Heart } from 'lucide-react';

export default function HeartDisplay({ hearts, maxHearts = 5 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          className={`w-5 h-5 transition-all duration-300 ${
            i < hearts
              ? 'text-red-400 fill-red-400'
              : 'text-muted-foreground/20 fill-muted-foreground/10'
          }`}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}