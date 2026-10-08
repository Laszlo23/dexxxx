import { Suspense } from "react";
import { PortfolioView } from "@/components/portfolio-view";

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Opening the bag…</div>}>
      <PortfolioView />
    </Suspense>
  );
}
