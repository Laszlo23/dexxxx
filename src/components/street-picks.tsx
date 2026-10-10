"use client";

import { useEffect, useState } from "react";
import { PassOn } from "@/components/pass-on";
import { SOCIALS } from "@/components/site-footer";
import type { NftReading } from "@/lib/portfolio";
import { pictureShareLine } from "@/lib/share-line";

const PICKS = ["CCFF00 #1", "Rare Friends Genesis #1"] as const;

type Ready = { status: "ready"; reading: NftReading } | { status: "missed"; message: string };

const loads = new Map<string, Promise<Ready>>();

function loadPick(query: string): Promise<Ready> {
  const existing = loads.get(query);
  if (existing) return existing;
  const pending = fetch(`/api/bound?q=${encodeURIComponent(query)}`)
    .then(async (response) => {
      const body = (await response.json()) as NftReading & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "That picture did not read.");
      return { status: "ready", reading: body } as const;
    })
    .catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : "That picture did not read.";
      return { status: "missed", message } as const;
    });
  loads.set(query, pending);
  return pending;
}

function usePicks() {
  const [picks, setPicks] = useState<Record<string, Ready>>({});

  useEffect(() => {
    let live = true;
    for (const query of PICKS) {
      void loadPick(query).then((pick) => {
        if (!live) return;
        setPicks((current) => ({ ...current, [query]: pick }));
      });
    }
    return () => {
      live = false;
    };
  }, []);

  return picks;
}

export function StreetTape() {
  const picks = usePicks();
  const lines = PICKS.flatMap((query) => {
    const pick = picks[query];
    if (!pick || pick.status !== "ready") return [];
    return [pictureShareLine(pick.reading)];
  });
  const marks =
    lines.length > 0 ? [...lines, "PASS THE DESK", ...SOCIALS.map((social) => social.label)] : ["PASS THE DESK", ...SOCIALS.map((social) => social.label)];
  const tape = [...marks, ...marks];

  return (
    <div className="overflow-hidden border-b border-lime/25">
      <div className="tape-track flex w-max gap-10 py-2 font-mono text-xs tracking-[0.14em] text-lime">
        {tape.map((mark, index) => (
          <span key={`${mark}-${index}`} className="shrink-0">
            {mark}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StreetPicks() {
  const picks = usePicks();

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {PICKS.map((query) => {
        const pick = picks[query];
        if (!pick) {
          return <div key={query} className="h-64 rounded-[28px] border border-lime/30 bg-ink/60" />;
        }
        if (pick.status === "missed") {
          return (
            <p key={query} className="rounded-[28px] border border-line px-4 py-6 text-sm text-mist">
              {query} is still on the way. {pick.message}
            </p>
          );
        }
        const reading = pick.reading;
        return (
          <PassOn
            key={query}
            kicker={reading.wallet ? "KEEPS A WALLET" : "STAYS A PICTURE"}
            title={reading.name}
            line={pictureShareLine(reading)}
            path={`/bound?q=${encodeURIComponent(query)}`}
            image={reading.image}
            cardSrc={`/card/picture?q=${encodeURIComponent(query)}`}
          />
        );
      })}
    </div>
  );
}
