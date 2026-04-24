import { POLICY_CONTENT } from '@/lib/legalContent';

export default function Privacy() {
  const content = POLICY_CONTENT.privacy;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f6f7fb_100%)] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl rounded-3xl border border-black/5 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6A6A6A]">Finapple</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.4px] text-black">{content.title}</h1>
        <p className="mt-2 text-sm text-[#686868]">시행일: {content.effectiveDate}</p>

        <section className="mt-8 space-y-7 text-sm leading-relaxed text-[#2D2D2D]">
          {content.sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-base font-bold text-black">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
