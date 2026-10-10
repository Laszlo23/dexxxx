import { TrendsView } from "@/components/trends-view";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "NFT floors and market tape",
  description: "Live Robinhood NFT floors and notes on the chain's stock-token and collectible markets.",
  path: "/trends",
  card: "trends",
});

export default function TrendsPage() {
  return <TrendsView />;
}
