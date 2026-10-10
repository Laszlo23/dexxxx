import { findCollection, COLLECTIONS } from "@/data/collections";
import { CARDS, cardFor } from "@/data/share-posts";
import { deskCard } from "@/lib/og-card";

function collectionCard(id: string) {
  const collection = findCollection(id);
  if (!collection) return null;
  return { kicker: collection.symbol, title: collection.name, line: collection.blurb };
}

export function generateStaticParams() {
  return [...Object.keys(CARDS), ...COLLECTIONS.map((collection) => collection.slug)].map((id) => ({ id }));
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const card = cardFor(id) ?? collectionCard(id);
  if (!card) return new Response("Unknown card.", { status: 404 });
  return deskCard(card);
}
