"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { explorerAddress, shortAddress } from "@/lib/format";
import type { BagNft, Portfolio } from "@/lib/portfolio";
import { NftImage } from "@/components/nft-image";

export function PortfolioView() {
  const params = useSearchParams();
  const { address } = useAccount();
  const [typed, setTyped] = useState<string | null>(null);
  const owner = (typed ?? params.get("address") ?? address ?? "").trim();
  const [bag, setBag] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAddress(owner)) return;
    const controller = new AbortController();
    setPending(true);
    fetch(`/api/portfolio?owner=${owner}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as Portfolio & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "The bag did not load.");
        setError(null);
        setBag(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setBag(null);
        setError(reason instanceof Error ? reason.message : "The bag did not load.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [owner]);

  const wallets = bag?.nfts.filter((nft) => nft.wallet) ?? [];
  const loose = bag?.nfts.filter((nft) => !nft.wallet) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <p className="font-mono text-[11px] tracking-[0.22em] text-lime">BAG</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl tracking-tight">Portfolio</h1>
          <p className="mt-2 max-w-xl text-mist">
            The connected wallet, every Robinhood NFT OpenSea can see, and the token-bound accounts sitting inside the brokers and machines.
          </p>
        </div>
        <label className="text-xs text-mist">
          Address
          <input
            value={typed ?? params.get("address") ?? address ?? ""}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            placeholder="0x…"
            className="mt-1 block w-72 rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm text-paper outline-none"
            aria-label="Wallet address"
          />
        </label>
      </div>

      {!owner ? <p className="mt-8 text-mist">Connect a wallet, or paste an address, and the bag opens.</p> : null}
      {owner && !isAddress(owner) ? <p className="mt-8 text-danger">That is not a wallet address.</p> : null}
      {pending ? <p className="mt-8 text-mist">Reading the chain and the OpenSea bag…</p> : null}
      {error ? <p className="mt-8 text-danger">{error}</p> : null}

      {bag && isAddress(owner) && bag.owner.toLowerCase() === owner.toLowerCase() ? (
        <>
          <section className="mt-8 rounded-3xl border border-line bg-panel/90 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-mono text-[11px] tracking-[0.18em] text-gold">SMART WALLET</p>
              <a className="font-mono text-sm text-lime" href={explorerAddress(bag.owner)} target="_blank" rel="noreferrer">
                {shortAddress(bag.owner)}
              </a>
            </div>
            {bag.holdings.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {bag.holdings.map((holding) => (
                  <div key={holding.symbol} className="rounded-2xl border border-line bg-ink/60 px-3 py-3">
                    <p className="font-mono text-[11px] text-mist">{holding.symbol}</p>
                    <p className="mt-1 font-mono text-lg">{holding.display}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-mist">No ETH, USDG, stock tokens, or desk coins in this address.</p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-2xl tracking-tight">NFT wallets</h2>
            <p className="mb-4 mt-1 text-sm text-mist">
              {wallets.length > 0
                ? `${wallets.length} token-bound account${wallets.length === 1 ? "" : "s"} inside this bag.`
                : "None of these NFTs resolved to a verified token-bound account."}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {wallets.map((nft) => (
                <WalletCard key={`${nft.contract}-${nft.id}`} nft={nft} />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl tracking-tight">The rest of the bag</h2>
            <p className="mb-4 mt-1 text-sm text-mist">{loose.length} more NFTs on Robinhood Chain.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {loose.map((nft) => (
                <a
                  key={`${nft.contract}-${nft.id}`}
                  href={nft.link}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-2xl border border-line bg-panel"
                >
                  <div className="aspect-square bg-panel-2">
                    <NftImage src={nft.image} alt={nft.name} />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm">{nft.name}</p>
                    <p className="font-mono text-[11px] text-mist">{nft.collection}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function WalletCard({ nft }: { nft: BagNft }) {
  const wallet = nft.wallet;
  if (!wallet) return null;
  return (
    <article className="grid grid-cols-[112px_1fr] overflow-hidden rounded-3xl border border-lime/40 bg-panel">
      <div className="bg-panel-2">
        <NftImage src={nft.image} alt={nft.name} />
      </div>
      <div className="p-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-lime">TOKEN-BOUND</p>
        <h3 className="mt-1 truncate text-lg">{nft.name}</h3>
        <a className="font-mono text-xs text-mist" href={explorerAddress(wallet.address)} target="_blank" rel="noreferrer">
          {shortAddress(wallet.address)}
        </a>
        {wallet.holdings.length > 0 ? (
          <ul className="mt-3 space-y-1 font-mono text-sm">
            {wallet.holdings.map((holding) => (
              <li key={holding.symbol} className="flex justify-between gap-3">
                <span className="text-mist">{holding.symbol}</span>
                <span>{holding.display}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-mist">The account is deployed and empty of the tokens this desk tracks.</p>
        )}
        <a href={nft.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-gold">
          OpenSea
        </a>
      </div>
    </article>
  );
}
