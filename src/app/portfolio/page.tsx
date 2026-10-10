import { Suspense } from "react";
import { PortfolioView } from "@/components/portfolio-view";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Wallet portfolio and NFT accounts",
  description: "A live Robinhood Chain portfolio: token balances, OpenSea NFTs, and the token-bound accounts inside them.",
  path: "/portfolio",
  card: "portfolio",
});

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Opening the bag…</div>}>
      <PortfolioView />
    </Suspense>
  );
}
