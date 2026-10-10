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
        <section className="trade-sheen rounded-[28px] border border-line bg-panel px-5 py-6">
          <p className="font-mono text-3xl text-lime">II</p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.22em] text-gold">THE FRIENDS</p>
          <h2 className="mt-2 text-3xl tracking-tight">Collections beside the book.</h2>
          <p className="mb-4 mt-3 max-w-xl text-sm leading-6 text-mist">
            Rare Friends leads, with love. The rest were read on Robinhood before they sat here.
          </p>
          <CollectionBoard compact />
        </section>
      </div>
      <Link
        href="/vibe"
        className="trade-sheen mt-6 flex flex-wrap items-end justify-between gap-3 rounded-[28px] border border-line bg-panel px-5 py-5 hover:border-lime/50"
      >
        <span>
          <span className="font-mono text-3xl text-lime">III</span>
          <span className="mt-3 block font-mono text-[11px] tracking-[0.22em] text-gold">VIBE.MARKET</span>
          <span className="mt-1 block text-2xl tracking-tight">ETH packs, passed along with care.</span>
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
