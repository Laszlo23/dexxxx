import { Suspense } from "react";
import { connection } from "next/server";
import { VibeShelfView } from "@/components/vibe-shelf";
import { pageMeta } from "@/lib/page-meta";
import { loadVibeShelf } from "@/lib/vibe-shelf";

export const metadata = pageMeta({
  title: "vibe.market packs",
  description: "Live ETH packs from vibe.market on Robinhood Chain. Opening a pack stays a wallet transaction on vibe.market.",
  path: "/vibe",
  card: "vibe",
});

export default function VibePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Reading the vibe.market shelf…</div>}>
      <VibeShelfLoader />
    </Suspense>
  );
}

async function VibeShelfLoader() {
  await connection();
  const shelf = await loadVibeShelf();
  return <VibeShelfView shelf={shelf} />;
}
