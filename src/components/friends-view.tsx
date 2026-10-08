"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { FillBid } from "@/components/fill-bid";
import { NftCard } from "@/components/nft-card";
import { RAREFRIENDS } from "@/config/contracts";
import { explorerAddress, formatCount, formatDisplay, shortAddress } from "@/lib/format";
import { betterOrder, type Listing } from "@/lib/listing";

type Token = { id: string; name: string; image: string };
type GenesisPage = {
  collection: { address: string; blurb: string };
  supply: number;
  tokens: Token[];
};

export function FriendsView() {
  const { address } = useAccount();
  const [page, setPage] = useState<GenesisPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<{ owner: string; ids: string[] } | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [asks, setAsks] = useState<Listing[]>([]);
  const [bids, setBids] = useState<Listing[]>([]);
  const [itemOffers, setItemOffers] = useState<Record<string, Listing>>({});
  const [links, setLinks] = useState<Record<string, string>>({});

  const { data: supply } = useReadContract({
    address: RAREFRIENDS,
    abi: erc20Abi,
    functionName: "totalSupply",
  });
  const { data: balance } = useReadContract({
    address: RAREFRIENDS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/collections/rare-friends-genesis?cursor=1", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as GenesisPage & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Genesis did not load.");
        setPage(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Genesis did not load.");
      });
    fetch("/api/quote?tokenIn=ETH&tokenOut=RAREFRIENDS&amount=1&slippageBps=50", {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as { amountOutDisplay?: string; error?: string };
        if (!response.ok) {
          setPriceNote(body.error ?? "No quote.");
          return;
        }
        setPrice(body.amountOutDisplay ?? null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!page) return;
    const ids = page.tokens.map((token) => token.id).join(",");
    const search = new URLSearchParams({ address: page.collection.address, ids });
    fetch(`/api/listings?${search}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          listings: Record<string, Listing>;
          asks?: Listing[];
          bids?: Listing[];
          links: Record<string, string>;
        };
        setListings(body.listings);
        setAsks(body.asks ?? []);
        setBids(body.bids ?? []);
        setLinks(body.links);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    if (!address) return;
    const search = new URLSearchParams({ slug: "rare-friends-genesis", owner: address });
    fetch(`/api/owned?${search}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { ids: string[] };
        setOwned({ owner: address, ids: body.ids });
      })
      .catch(() => undefined);
  }, [address]);

  useEffect(() => {
    if (!page || !address || owned?.owner !== address || owned.ids.length === 0) return;
    const controller = new AbortController();
    const search = new URLSearchParams({
      address: page.collection.address,
      ids: owned.ids.slice(0, 12).join(","),
      itemOffers: "1",
    });
    fetch(`/api/listings?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { itemOffers?: Record<string, Listing> };
        setItemOffers(body.itemOffers ?? {});
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [address, owned, page]);

  const heldIds = owned && owned.owner === address ? owned.ids : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <p className="font-mono text-[11px] tracking-[0.22em] text-gold">GENESIS</p>
      <h1 className="mt-2 max-w-2xl text-4xl tracking-tight sm:text-5xl">
        Rare Friends, sitting on the same chain as the book.
      </h1>
      <p className="mt-3 max-w-xl text-mist">
        One thousand twenty-four on-chain friends, plus the $RAREFRIENDS token they spend.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-gold/50 bg-panel p-4">
          <p className="font-mono text-[11px] text-gold">$RAREFRIENDS</p>
          <p className="mt-2 font-mono text-sm text-mist">
            {supply !== undefined ? `${formatDisplay(supply, 18)} supply` : "Reading supply…"}
          </p>
          <p className="font-mono text-sm text-mist">
            {address && balance !== undefined ? `${formatDisplay(balance, 18)} in wallet` : "Wallet balance appears after connect"}
          </p>
          <a className="mt-3 block text-xs text-lime" href={explorerAddress(RAREFRIENDS)} target="_blank" rel="noreferrer">
            {shortAddress(RAREFRIENDS)}
          </a>
        </div>
        <div className="rounded-3xl border border-line bg-panel p-4">
          <p className="font-mono text-[11px] text-lime">1 ETH QUOTE</p>
          <p className="mt-2 font-mono text-2xl">
            {price ? `${price} RAREFRIENDS` : "—"}
          </p>
          <p className="text-sm text-mist">{priceNote ?? "Best Uniswap v3 tier."}</p>
          <Link href="/?sell=ETH&buy=RAREFRIENDS" className="mt-3 inline-block text-sm text-lime">
            Open the swap
          </Link>
        </div>
        <div className="rounded-3xl border border-line bg-panel p-4">
          <p className="font-mono text-[11px] text-mist">YOUR GENESIS</p>
          <p className="mt-2 text-sm text-paper">
            {!address
              ? "Connect to scan the 1,024 friends for this wallet."
              : owned?.owner === address && owned.ids.length > 0
                ? owned.ids.map((id) => `#${id}`).join(", ")
                : owned?.owner === address
                  ? "No Genesis tokens in this wallet."
                  : "Scanning this wallet…"}
          </p>
        </div>
      </div>

      {error ? <p className="mt-6 text-danger">{error}</p> : null}
      {bids.length > 0 && page ? (
        <section className="mt-8">
          <h2 className="text-2xl tracking-tight">Bids on Genesis</h2>
          <p className="mb-3 text-sm text-mist">
            Sell a friend you hold into a live OpenSea offer. Approval, then the sale, both in this wallet.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {bids.map((bid) => (
              <FillBid
                key={bid.hash}
                bid={bid}
                ownedIds={heldIds}
                contractAddress={page.collection.address}
              />
            ))}
          </div>
        </section>
      ) : null}
      {asks.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl tracking-tight">Genesis for sale</h2>
          <p className="mb-3 text-sm text-mist">Live OpenSea asks, filled in this wallet.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {asks.map((ask) => (
              <NftCard
                key={ask.hash}
                id={ask.tokenId}
                name={`Genesis #${ask.tokenId}`}
                image=""
                listing={ask}
                link={links[ask.tokenId] ?? `https://opensea.io/item/robinhood/${page?.collection.address}/${ask.tokenId}`}
              />
            ))}
          </div>
        </section>
      ) : null}
      <div className="mt-8 flex items-end justify-between">
        <h2 className="text-2xl tracking-tight">First page of Genesis</h2>
        <Link href="/collections/rare-friends-genesis" className="text-sm text-lime">
          Whole collection
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(page?.tokens ?? []).map((token) => {
          const held = heldIds.includes(token.id);
          return (
            <NftCard
              key={token.id}
              id={token.id}
              name={token.name}
              image={token.image}
              listing={listings[token.id]}
              offer={held ? betterOrder(itemOffers[token.id], bids[0]) : undefined}
              link={links[token.id] ?? `https://opensea.io/item/robinhood/${page?.collection.address}/${token.id}`}
            />
          );
        })}
      </div>
      {!page && !error ? <p className="mt-4 text-mist">Pulling Genesis art from the chain…</p> : null}
      {page ? (
        <p className="mt-4 font-mono text-xs text-mist">{formatCount(page.supply)} minted</p>
      ) : null}
    </div>
  );
}
