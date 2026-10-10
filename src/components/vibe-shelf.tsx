import { StoryOpen } from "@/components/story-frame";
import { VIBE_INVITE, vibeHref } from "@/config/vibe";
import type { VibeShelf } from "@/lib/vibe-shelf";

export function VibeShelfView({ shelf }: { shelf: VibeShelf | null }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <StoryOpen
        numeral="I"
        kicker="VIBE.MARKET"
        title="Packs, passed along."
        lede={`These are the live ETH packs on vibe.market for chain 4663. The listed price is the one published with the shelf. Opening a pack stays in your wallet, and invite ${VIBE_INVITE} rides along.`}
      />
      {shelf ? <Shelf shelf={shelf} /> : <ShelfDown />}
    </div>
  );
}

function Shelf({ shelf }: { shelf: VibeShelf }) {
  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <p className="font-mono text-sm text-lime">
          {shelf.label}
          <span className="text-mist"> · {shelf.priceLabel}</span>
          {shelf.usdLabel ? <span className="text-mist"> · {shelf.usdLabel}</span> : null}
        </p>
        <a
          href={shelf.marketHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-lime/60"
        >
          Open the market
        </a>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shelf.packs.map((pack) => (
          <article
            key={pack.slug}
            className={`overflow-hidden rounded-3xl border bg-panel ${
              pack.featured ? "border-lime/70" : "border-line"
            }`}
          >
            <img
              src={pack.image}
              alt=""
              width={640}
              height={640}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover"
              style={pack.color ? { background: pack.color } : undefined}
            />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg tracking-tight">{pack.name}</h2>
                  {pack.symbol ? <p className="font-mono text-[11px] tracking-wide text-mist">{pack.symbol}</p> : null}
                </div>
                <p className="font-mono text-sm text-lime">{shelf.priceLabel}</p>
              </div>
              {pack.blurb ? <p className="text-sm leading-6 text-mist">{pack.blurb}</p> : null}
              <div className="flex h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
                {pack.odds.map((tier, index) => (
                  <span
                    key={`${pack.slug}-${index}`}
                    className="h-full bg-lime"
                    style={{ width: `${tier.bps / 100}%`, opacity: 0.35 + Math.min(tier.payout, 8) / 12 }}
                  />
                ))}
              </div>
              <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-mist">
                {pack.odds.map((tier, index) => (
                  <span key={`${pack.slug}-tier-${index}`}>
                    {(tier.bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}% · {tier.payout}×
                  </span>
                ))}
              </p>
              <a
                href={pack.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink"
              >
                Open {pack.name}
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ShelfDown() {
  return (
    <div className="mt-6 rounded-3xl border border-line bg-panel p-6">
      <p className="text-sm text-mist">The live shelf did not load. The market is still open, with the invite on the link.</p>
      <a
        href={vibeHref()}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink"
      >
        Open vibe.market
      </a>
    </div>
  );
}
