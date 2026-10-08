import { CollectionBoard } from "@/components/collection-board";

export default function CollectionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <p className="font-mono text-[11px] tracking-[0.22em] text-lime">REGISTRY</p>
      <h1 className="mt-2 text-4xl tracking-tight">Collections</h1>
      <p className="mb-6 mt-2 max-w-xl text-mist">
        Each contract was read on Robinhood Chain before it landed here. Floors appear when an
        OpenSea key is configured.
      </p>
      <CollectionBoard />
    </div>
  );
}
