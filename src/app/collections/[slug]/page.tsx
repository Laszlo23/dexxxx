import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-mist">Opening the collection…</div>}>
      <CollectionView />
    </Suspense>
  );
}
