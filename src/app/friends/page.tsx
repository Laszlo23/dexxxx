import { FriendsView } from "@/components/friends-view";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Rare Friends Genesis NFTs",
  description: "Rare Friends Genesis on Robinhood Chain. Browse the 1,024 friends and fill the OpenSea book.",
  path: "/friends",
  card: "friends",
});

export default function FriendsPage() {
  return <FriendsView />;
}
