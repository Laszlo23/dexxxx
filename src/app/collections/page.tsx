import { CollectionBoard } from "@/components/collection-board";
import { StoryOpen } from "@/components/story-frame";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Verified NFT collections",
  description: "Verified ERC-721 sets on Robinhood Chain, with live OpenSea floors.",
  path: "/collections",
  card: "collections",
});

export default function CollectionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <StoryOpen
        numeral="I"
        kicker="THE REGISTRY"
        title="The sets we already love."
        lede="Each contract was read on Robinhood before it landed here. A floor shows up when the live book has one."
      />
      <div className="mt-6">
        <CollectionBoard />
      </div>
    </div>
  );
}
