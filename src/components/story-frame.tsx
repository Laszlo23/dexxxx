import type { ReactNode } from "react";

export function StoryOpen({
  kicker,
  title,
  lede,
  children,
  numeral,
}: {
  kicker: string;
  title: string;
  lede: string;
  children?: ReactNode;
  numeral?: string;
}) {
  return (
    <header className="trade-sheen rounded-[28px] border border-line bg-panel px-6 py-8 sm:px-8">
      <div className="flex items-start gap-4">
        {numeral ? <p className="font-mono text-3xl leading-none text-lime">{numeral}</p> : null}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] tracking-[0.22em] text-gold">{kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-mist">{lede}</p>
          {children}
        </div>
      </div>
    </header>
  );
}

export function Chapter({
  id,
  numeral,
  kicker,
  title,
  lede,
  children,
}: {
  id?: string;
  numeral: string;
  kicker: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="mt-8 grid gap-4 border-t border-line pt-8 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-6">
      <p className="font-mono text-3xl text-lime">{numeral}</p>
      <div>
        <p className="font-mono text-[11px] tracking-[0.22em] text-gold">{kicker}</p>
        <h2 className="mt-2 text-3xl tracking-tight">{title}</h2>
        {lede ? <p className="mt-3 max-w-xl text-sm leading-6 text-mist">{lede}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </section>
  );
}
