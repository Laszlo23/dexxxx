"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TRENDS } from "@/data/trends";

type Floor = { amount: string; symbol: string } | null;
type Card = { slug: string; name: string; symbol: string; floor: Floor };

export function TrendsView() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collections", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { collections: Card[] };
        setCards(body.collections);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const tape = (cards ?? []).filter((card) => card.floor);
  const loop = tape.length > 0 ? [...tape, ...tape] : [];
  const stonk = cards?.find((card) => card.slug === "stonkbrokers");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <p className="font-mono text-[11px] tracking-[0.22em] text-gold">TAPE</p>
      <h1 className="mt-2 max-w-3xl text-4xl tracking-tight sm:text-5xl">What the chain is doing.</h1>
      <p className="mt-3 max-w-xl text-mist">
        Four notes on Robinhood NFTs, plus the floors this desk is reading right now.
      </p>

      <div className="tape-mask mt-6 overflow-hidden rounded-full border border-line bg-panel">
        {loop.length > 0 ? (
          <div className="tape-track flex w-max gap-8 py-3 font-mono text-sm">
            {loop.map((card, index) => (
              <Link key={`${card.slug}-${index}`} href={`/collections/${card.slug}`} className="shrink-0 text-paper">
                <span className="text-mist">{card.symbol}</span>{" "}
                <span className="text-lime">
                  {card.floor?.amount} {card.floor?.symbol}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm text-mist">Pulling floors…</p>
        )}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {TRENDS.map((trend) => (
          <article key={trend.slug} className="rounded-3xl border border-line bg-panel/90 p-5">
            <p className="font-mono text-[11px] tracking-[0.18em] text-lime">{trend.kicker}</p>
            <h2 className="mt-2 text-2xl tracking-tight">{trend.title}</h2>
            <p className="mt-3 text-sm leading-6 text-mist">{trend.body}</p>
            {trend.slug === "the-repricing" && stonk?.floor ? (
              <p className="mt-3 font-mono text-sm text-gold">
                Live floor {stonk.floor.amount} {stonk.floor.symbol}
              </p>
            ) : null}
            <a href={trend.href} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-paper">
              {trend.source}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
