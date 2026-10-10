"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { explorerAddress, shortAddress } from "@/lib/format";
import type { AccountKind, Holding, NftReading } from "@/lib/portfolio";
import { NftImage } from "@/components/nft-image";
import { StoryOpen } from "@/components/story-frame";

const SAMPLES = ["CCFF00 #1", "Rare Friends Genesis #1"] as const;

export function BoundView() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const [reading, setReading] = useState<NftReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    setPending(true);
    fetch(`/api/bound?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as NftReading & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "That picture did not read.");
        setError(null);
        setReading(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setReading(null);
        setError(reason instanceof Error ? reason.message : "That picture did not read.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [query]);

  function read(next: string) {
    const trimmed = next.trim();
    if (!trimmed) return;
    router.replace(`/bound?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <StoryOpen
        kicker="ONE PICTURE"
        title="Funds bound to a picture."
        lede="A picture on a chain can be more than a JPEG. Paste one. The desk says whether it is a wallet, a wallet an agent can use, art stored in the contract, a record of work, or a picture with no use found."
      >
        {pending ? <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-lime">Reading the account bound to this picture.</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <form
          className="mt-6 max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            read(draft);
          }}
        >
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.18em] text-lime">THE PICTURE</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              placeholder="CCFF00 #1"
              className="mt-2 block w-full rounded-2xl border border-line bg-ink px-4 py-3 font-mono text-sm text-paper outline-none"
              aria-label="NFT"
            />
          </label>
          <button type="submit" className="mt-3 rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink">
            Read it
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => read(sample)}
              className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mist hover:text-paper"
            >
              {sample}
            </button>
          ))}
        </div>
      </StoryOpen>

      {reading && query ? (
        <article className="mt-6 overflow-hidden rounded-3xl border border-lime/40 bg-panel sm:grid sm:grid-cols-[220px_1fr]">
          <div className="aspect-square bg-panel-2 sm:aspect-auto">
            <NftImage src={reading.image} alt={reading.name} />
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-mono text-[11px] tracking-[0.16em] text-lime">
              {reading.wallet ? roleLabel(reading.wallet.kind) : "PICTURE"} · {reading.collection}
            </p>
            <h2 className="mt-1 text-2xl tracking-tight">{reading.name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-mist">{verdict(reading)}</p>
            {reading.use ? (
              <div className="mt-4 max-w-xl">
                <p className="font-mono text-[11px] tracking-[0.18em] text-lime">WHAT IT DOES</p>
                <p className="mt-2 text-sm leading-6 text-paper">{reading.use.body}</p>
              </div>
            ) : (
              <p className="mt-4 max-w-xl text-sm leading-6 text-mist">
                This desk has not found a wallet, on-chain art, or another use bound to this picture.
              </p>
            )}
            {reading.wallet && reading.wallet.holdings.length > 0 ? <Ledger holdings={reading.wallet.holdings} /> : null}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
              <a className="text-gold" href={explorerAddress(reading.owner)} target="_blank" rel="noreferrer">
                Owner {shortAddress(reading.owner)}
              </a>
              {reading.wallet ? (
                <a className="text-gold" href={explorerAddress(reading.wallet.address)} target="_blank" rel="noreferrer">
                  Account {shortAddress(reading.wallet.address)}
                </a>
              ) : null}
              <a className="text-mist" href={reading.link} target="_blank" rel="noreferrer">
                OpenSea
              </a>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}

function Ledger({ holdings }: { holdings: Holding[] }) {
  return (
    <ul className="mt-4 max-w-md">
      {holdings.map((holding) => (
        <li
          key={`${holding.symbol}-${holding.name}`}
          className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 font-mono text-sm"
        >
          <span className="text-mist">
            {holding.symbol}
            <span className="ml-2 text-xs">{holding.name}</span>
          </span>
          <span>{holding.display}</span>
        </li>
      ))}
    </ul>
  );
}

function roleLabel(kind: AccountKind): string {
  switch (kind) {
    case "wallet":
      return "WALLET";
    case "agent":
      return "AGENT";
    default: {
      const unexpected: never = kind;
      return unexpected;
    }
  }
}

function roleSentence(kind: AccountKind): string {
  switch (kind) {
    case "wallet":
      return "a wallet";
    case "agent":
      return "a wallet an agent can use";
    default: {
      const unexpected: never = kind;
      return unexpected;
    }
  }
}

function verdict(reading: NftReading): string {
  const wallet = reading.wallet;
  if (!wallet) {
    return `${reading.name} stays a picture. This contract does not publish a token-bound account, so no funds are bound to it.`;
  }
  const place = reading.deployed
    ? "The account contract is already on chain."
    : "The account address is fixed, and the contract is not deployed yet. Funds can still sit there.";
  const lead = wallet.holdings[0];
  if (!lead) return `${reading.name} is ${roleSentence(wallet.kind)}. ${place} The tracked balances in it are zero.`;
  const funds = wallet.holdings.map((holding) => `${holding.display} ${holding.symbol}`).join(", ");
  return `${reading.name} is ${roleSentence(wallet.kind)}. ${place} Bound to it: ${funds}.`;
}
