import { Suspense } from "react";
import { connection } from "next/server";
import { BoundView } from "@/components/bound-view";
import { pageMeta } from "@/lib/page-meta";
import { parseNftQuery, readNftBinding } from "@/lib/portfolio";
import { pictureShareLine } from "@/lib/share-line";

const BOUND = {
  title: "Funds bound to an NFT",
  description:
    "Paste a Robinhood NFT and read whether a wallet or an agent account is bound to it, and which funds are sitting there.",
  path: "/bound",
  card: "bound",
} as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const fallback = pageMeta(BOUND);
  if (!query) return fallback;
  const parsed = parseNftQuery(query);
  if (!parsed) return fallback;
  try {
    const reading = await readNftBinding(parsed.contract, parsed.id);
    const line = pictureShareLine(reading);
    return pageMeta({
      title: reading.name,
      description: line,
      path: `/bound?q=${encodeURIComponent(query)}`,
      card: "bound",
      image: `/card/picture?q=${encodeURIComponent(query)}`,
    });
  } catch {
    return fallback;
  }
}

export default function BoundPage() {
  return (
    <>
      <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-mist">Opening the reading…</div>}>
        <BoundView />
      </Suspense>
      <Suspense fallback={null}>
        <BoundConnection />
      </Suspense>
    </>
  );
}

async function BoundConnection() {
  await connection();
  return null;
}
