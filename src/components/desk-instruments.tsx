"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COLLECTIONS } from "@/data/collections";
import { formatDisplay } from "@/lib/format";
import type { Listing } from "@/lib/listing";

const GENESIS = COLLECTIONS.find((item) => item.slug === "rare-friends-genesis") ?? COLLECTIONS[0];
const USDG_DECIMALS = 6;

type Tape = {
  ask: Listing | null;
  bid: Listing | null;
};

const STATIONS = [
  { label: "Book", href: "/", detail: "Swap the bid token" },
  { label: "Ask", href: "/collections/rare-friends-genesis", detail: "Buy the listing" },
  { label: "Hold", href: "/friends", detail: "The friend sits here" },
  { label: "Bid", href: "/collections/rare-friends-genesis", detail: "Sell into the offer" },
] as const;

type StationLabel = (typeof STATIONS)[number]["label"];

function stationDetail(label: StationLabel, ask: Listing | null, bid: Listing | null, fallback: string): string {
  switch (label) {
    case "Ask":
      return ask ? `${ask.price} ${ask.symbol}` : fallback;
    case "Bid":
      return bid ? `${bid.price} ${bid.symbol}` : fallback;
    case "Book":
    case "Hold":
      return fallback;
    default: {
      const unknown: never = label;
      return unknown;
    }
  }
}

function money(raw: string): string {
  return formatDisplay(BigInt(raw), USDG_DECIMALS);
}

export function DeskInstruments() {
  const [tape, setTape] = useState<Tape | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const search = new URLSearchParams({ address: GENESIS.address, ids: "1" });
    fetch(`/api/listings?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { asks?: Listing[]; bids?: Listing[] };
        setTape({
          ask: body.asks?.[0] ?? null,
          bid: body.bids?.[0] ?? null,
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const ask = tape?.ask ?? null;
  const bid = tape?.bid ?? null;
  const sameBook = Boolean(ask && bid && ask.symbol === bid.symbol);
  const spread =
    sameBook && ask && bid ? money((BigInt(ask.rawAmount) - BigInt(bid.rawAmount)).toString()) : null;
  const askRatio =
    sameBook && ask && bid && BigInt(ask.rawAmount) > 0n
      ? Number((BigInt(bid.rawAmount) * 10_000n) / BigInt(ask.rawAmount)) / 100
      : null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="trade-sheen relative overflow-hidden rounded-[28px] border border-line bg-panel/90 p-5">
        <p className="font-mono text-[11px] tracking-[0.22em] text-gold">FLYLOOP</p>
        <h2 className="mt-1 text-2xl tracking-tight">The desk turns in one circle.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-mist">Every stop is a place this desk already loves.</p>
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
          <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44" aria-hidden="true">
            <circle cx="100" cy="100" r="68" fill="none" stroke="#2c3324" strokeWidth="8" />
            <circle
              className="fly-dash-gold"
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke="#f0b45a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              className="fly-dash"
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke="#dff25a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text x="100" y="96" textAnchor="middle" fill="#f4f6ec" fontSize="13" fontFamily="ui-monospace, monospace">
              USDG
            </text>
            <text x="100" y="114" textAnchor="middle" fill="#9aa392" fontSize="9" fontFamily="ui-monospace, monospace">
              IN MOTION
            </text>
          </svg>
          <ol className="space-y-2">
            {STATIONS.map((station, index) => (
              <li key={station.label}>
                <Link href={station.href} className="flex items-baseline justify-between gap-3 rounded-2xl border border-line bg-ink/50 px-3 py-2 hover:border-lime/50">
                  <span className="font-mono text-[11px] text-lime">0{index + 1}</span>
                  <span className="text-sm">{station.label}</span>
                  <span className="ml-auto truncate text-right text-xs text-mist">
                    {stationDetail(station.label, ask, bid, station.detail)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="trade-sheen rounded-[28px] border border-gold/40 bg-panel/90 p-5">
        <p className="font-mono text-[11px] tracking-[0.22em] text-gold">THE EDGE</p>
        <h2 className="mt-1 text-2xl tracking-tight">
          {spread ? (
            <>
              {spread} <span className="text-gold">{ask?.symbol}</span>
            </>
          ) : tape ? (
            "Waiting on both sides"
          ) : (
            "Reading the book…"
          )}
        </h2>
        <p className="mt-2 max-w-md text-sm text-mist">
          Room between the cheapest Genesis ask and the best bid already sitting on OpenSea. Held with care.
        </p>
        <div className="mt-5">
          <div className="relative h-2 overflow-hidden rounded-full bg-panel-2">
            <div
              className="absolute inset-y-0 left-0 bg-lime"
              style={{ width: askRatio === null ? "0%" : `${Math.min(askRatio, 100)}%` }}
            />
            <div className="absolute inset-y-0 right-0 w-1 bg-gold" />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-mist">
            <span>{bid ? `Bid ${bid.price} ${bid.symbol}` : "No bid"}</span>
            <span>{ask ? `Ask ${ask.price} ${ask.symbol}` : "No ask"}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {ask ? (
            <Link
              href="/collections/rare-friends-genesis"
              className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink"
            >
              Buy #{ask.tokenId} · {ask.price} {ask.symbol}
            </Link>
          ) : null}
          {bid ? (
            <Link
              href="/collections/rare-friends-genesis"
              className="rounded-full border border-lime px-4 py-2 text-sm text-lime"
            >
              Sell into {bid.price} {bid.symbol}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
