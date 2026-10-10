import { Suspense } from "react";
import { PoolDesk } from "@/components/pool-desk";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Uniswap v3 NFT token pools",
  description: "Open and fund Uniswap v3 pools for Rare Friends, StonkBroker, and CCFF00 on Robinhood Chain.",
  path: "/pools",
  card: "pools",
});

export default function PoolsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Reading the pools…</div>}>
      <PoolDesk />
    </Suspense>
  );
}
