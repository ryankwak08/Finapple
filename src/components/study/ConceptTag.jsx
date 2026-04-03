import { useState } from 'react';

export default function ConceptTag({ concept }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="animate-scale-in">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left rounded-xl border transition-all duration-200 ${
          open
            ? 'bg-primary/5 border-primary/20 shadow-sm'
            : 'bg-card border-border hover:border-primary/20'
        } p-4`}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[14px] text-foreground">{concept.term}</span>
          <span className={`text-[12px] text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
        {open && (
          <p className="text-muted-foreground text-[13px] mt-2 leading-relaxed animate-slide-up">
            {concept.definition}
          </p>
        )}
      </button>
    </div>
  );
}