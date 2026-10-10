"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { formatCount } from "@/lib/format";
import { NftImage } from "@/components/nft-image";

type Floor = { amount: string; symbol: string } | null;

export type CollectionCard = {
  slug: string;
  name: string;
  symbol: string;
  address: Address;
  hero: boolean;
  blurb: string;
  supply: number | null;
  floor: Floor;
  preview: { name: string; image: string; description: string } | null;
};

export function CollectionBoard({ compact = false }: { compact?: boolean }) {
  const [cards, setCards] = useState<CollectionCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collections", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The board did not load.");
        const body = (await response.json()) as { collections: CollectionCard[] };
        setCards(body.collections);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "The board did not load.");
      });
    return () => controller.abort();
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!cards) {
    return (
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {Array.from({ length: compact ? 4 : 6 }, (_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-3xl border border-line bg-panel" />
        ))}
      </div>
    );
  }

  const hero = cards.find((card) => card.hero);
  const visible = compact
    ? [hero, ...cards.filter((card) => !card.hero)].filter((card): card is CollectionCard => Boolean(card)).slice(0, 4)
    : cards;

  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
      {visible.map((card) => (
          <Link
            key={card.slug}
            href={`/collections/${card.slug}`}
            className={`group overflow-hidden rounded-[28px] border bg-panel transition-colors hover:border-lime/50 ${
              card.hero ? "border-gold/70 sm:col-span-2" : "border-line"
            }`}
          >
            <div className={`bg-panel-2 ${card.hero ? "h-52" : "h-40"}`}>
              <NftImage src={card.preview?.image ?? ""} alt={card.preview?.name || card.name} />
            </div>
            <div className="space-y-1 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg tracking-tight">{card.name}</h2>
                <span className="font-mono text-xs text-mist">{card.symbol}</span>
              </div>
              <p className="text-sm text-mist">{card.blurb}</p>
              <p className="font-mono text-xs text-lime">
                {card.supply === null ? "Supply unread" : `${formatCount(card.supply)} minted`}
                {card.floor ? ` · floor ${card.floor.amount} ${card.floor.symbol}` : ""}
              </p>
            </div>
          </Link>
      ))}
    </div>
  );
}
