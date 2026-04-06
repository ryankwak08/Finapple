import { useState } from 'react';

export default function ConceptTag({ concept }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="animate-scale-in">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
          open
            ? 'bg-primary/5 border-primary/20 shadow-sm'
            : 'bg-card border-border hover:border-primary/20'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-[14px] leading-snug text-foreground">{concept.term}</span>
          <span className={`pt-0.5 text-[12px] text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
        {open && (
          <p className="mt-2 animate-slide-up text-[13px] leading-relaxed text-muted-foreground">
            {concept.definition}
          </p>
        )}
      </button>
    </div>
  );
}
