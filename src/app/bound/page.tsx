import { Suspense } from "react";
import { BoundView } from "@/components/bound-view";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Funds bound to an NFT",
  description: "Paste a Robinhood NFT and read whether a wallet or an agent account is bound to it, and which funds are sitting there.",
  path: "/bound",
  card: "bound",
});

export default function BoundPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Opening the reading…</div>}>
      <BoundView />
    </Suspense>
  );
}
