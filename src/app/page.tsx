import { Suspense } from "react";
import { CollectionBoard } from "@/components/collection-board";
import { DeskInstruments } from "@/components/desk-instruments";
import { SwapPanel } from "@/components/swap-panel";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <DeskInstruments />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        <Suspense fallback={<div className="h-[520px] rounded-3xl border border-line bg-panel" />}>
          <SwapPanel />
        </Suspense>
        <section>
          <p className="font-mono text-[11px] tracking-[0.22em] text-gold">ON THE CHAIN</p>
          <h2 className="mt-2 text-2xl tracking-tight">Collections beside the book</h2>
          <p className="mb-4 mt-1 text-sm text-mist">
            Rare Friends leads. The rest are verified ERC-721 sets on Robinhood Chain.
          </p>
          <CollectionBoard compact />
        </section>
      </div>
    </div>
  );
}
