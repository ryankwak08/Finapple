import { Crown } from 'lucide-react';

export default function PremiumBadge({ compact = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 text-amber-900 ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } font-bold`}
    >
      <Crown className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      PREMIUM
    </span>
  );
}
