import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";
import { COLLECTIONS } from "@/data/collections";
import { pageMeta } from "@/lib/page-meta";

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = COLLECTIONS.find((item) => item.slug === slug);
  if (!collection) {
    return { title: "Collection" };
  }
  return pageMeta({
    title: `${collection.name} NFTs`,
    description: collection.blurb,
    path: `/collections/${collection.slug}`,
    card: collection.slug,
  });
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-mist">Opening the collection…</div>}>
      <CollectionView />
    </Suspense>
  );
}
