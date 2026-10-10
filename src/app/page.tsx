import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { CollectionBoard } from "@/components/collection-board";
import { SwapPanel } from "@/components/swap-panel";

const DeskInstruments = dynamic(
  () => import("@/components/desk-instruments").then((mod) => mod.DeskInstruments),
  { loading: () => <div className="h-48 rounded-3xl border border-line bg-panel" /> },
);
const DeskTasks = dynamic(() => import("@/components/desk-tasks").then((mod) => mod.DeskTasks), {
  loading: () => <div className="mt-3 h-64 rounded-3xl border border-line bg-panel" />,
});

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <Suspense fallback={<div className="h-[640px] rounded-[28px] border border-line bg-panel" />}>
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
      <Link
        href="/vibe"
        className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-line bg-panel px-5 py-4 hover:border-lime/50"
      >
        <span>
          <span className="font-mono text-[11px] tracking-[0.22em] text-gold">VIBE.MARKET</span>
          <span className="mt-1 block text-lg tracking-tight">ETH packs on Robinhood</span>
        </span>
        <span className="text-sm text-lime">Open the shelf</span>
      </Link>
      <div className="mt-6">
        <DeskInstruments />
      </div>
      <DeskTasks />
    </div>
  );
}
