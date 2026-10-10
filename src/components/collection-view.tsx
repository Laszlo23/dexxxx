"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { FillBid } from "@/components/fill-bid";
import { MintPanel } from "@/components/mint-panel";
import { explorerAddress, formatCount, shortAddress } from "@/lib/format";
import { betterOrder, type Listing } from "@/lib/listing";
import { NftCard } from "@/components/nft-card";
import { PassOn } from "@/components/pass-on";
import { Chapter, StoryOpen } from "@/components/story-frame";

type Token = { id: string; name: string; image: string; description: string };
type Page = {
  collection: {
    slug: string;
    name: string;
    symbol: string;
    address: Address;
    blurb: string;
    use: { title: string; body: string } | null;
  };
  supply: number;
  tokens: Token[];
  nextCursor: number | null;
  cursor: number;
};

export function CollectionView() {
  const route = useParams<{ slug: string }>();
  const slug = route.slug;
  const { address } = useAccount();
  const [page, setPage] = useState<Page | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [asks, setAsks] = useState<Listing[]>([]);
  const [bids, setBids] = useState<Listing[]>([]);
  const [itemOffers, setItemOffers] = useState<Record<string, Listing>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [owned, setOwned] = useState<{ owner: string; ids: string[] } | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [seenSlug, setSeenSlug] = useState(slug);
  if (seenSlug !== slug) {
    setSeenSlug(slug);
    setCursor(null);
    setPage(null);
    setListings({});
    setAsks([]);
    setBids([]);
    setItemOffers({});
    setOwned(null);
    setSkipped(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    const search = cursor === null ? "" : `?cursor=${cursor}`;
    fetch(`/api/collections/${slug}${search}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as Page & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unknown collection.");
        setError(null);
        setPage(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "This collection did not load.");
      });
    return () => controller.abort();
  }, [slug, cursor]);

  useEffect(() => {
    if (!page) return;
    const ids = page.tokens.map((token) => token.id).join(",");
    if (!ids) return;
    const controller = new AbortController();
    const search = new URLSearchParams({ address: page.collection.address, ids });
    fetch(`/api/listings?${search}`, { signal: controller.signal })
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
    return () => controller.abort();
  }, [page]);

  useEffect(() => {
    if (!address) return;
    const controller = new AbortController();
    const search = new URLSearchParams({ slug, owner: address });
    fetch(`/api/owned?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { ids: string[]; skipped: boolean };
        setOwned({ owner: address, ids: body.ids });
        setSkipped(body.skipped);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [address, slug]);

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

  if (error) {
    return <p className="mx-auto max-w-6xl px-4 py-10 text-danger">{error}</p>;
  }
  if (!page) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-mist">Opening the collection…</div>;
  }

  const heldIds = owned && owned.owner === address ? owned.ids : [];
  const hasBids = bids.length > 0;
  const hasAsks = asks.length > 0;
  const pictureNumeral = hasBids && hasAsks ? "IV" : hasBids || hasAsks ? "III" : "II";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <StoryOpen numeral="I" kicker={page.collection.symbol} title={page.collection.name} lede={page.collection.blurb}>
        <p className="mt-4 font-mono text-sm text-mist">
          {formatCount(page.supply)} on chain
          {" · "}
          <a className="text-lime hover:underline" href={explorerAddress(page.collection.address)} target="_blank" rel="noreferrer">
            {shortAddress(page.collection.address)}
          </a>
        </p>
        {page.collection.use ? (
          <div className="mt-5 max-w-xl">
            <p className="font-mono text-[11px] tracking-[0.18em] text-lime">WHAT IT DOES</p>
            <p className="mt-2 text-sm leading-6 text-paper">{page.collection.use.body}</p>
          </div>
        ) : null}
        <PassOn
          title={`Pass ${page.collection.name}`}
          line={page.collection.use?.title ?? page.collection.blurb}
          path={`/collections/${page.collection.slug}`}
          cardSrc={`/card/${page.collection.slug}`}
        />
      </StoryOpen>
      <MintPanel slug={slug} />
      {address ? (
        <p className="mt-4 text-sm text-mist">
          {skipped
            ? "This set is too large to scan for your wallet from the page."
            : owned?.owner === address && owned.ids.length > 0
              ? `You hold ${owned.ids.map((id) => `#${id}`).slice(0, 12).join(", ")}`
              : owned?.owner === address
                ? "None of these token ids sit in the connected wallet."
                : "Scanning this wallet…"}
        </p>
      ) : null}
      {hasBids ? (
        <Chapter
          numeral="II"
          kicker="THE BIDS"
          title="Offers already waiting."
          lede="Standing OpenSea offers. Selling pays you in the bid token. The marketplace fee is taken from that bid."
        >
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
        </Chapter>
      ) : null}
      {hasAsks ? (
        <Chapter
          numeral={hasBids ? "III" : "II"}
          kicker="THE ASKS"
          title="Pictures already for sale."
          lede="Cheapest live asks. USDG listings approve the OpenSea conduit, then buy in the same wallet."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {asks.map((ask) => (
              <NftCard
                key={ask.hash}
                id={ask.tokenId}
                name={`${page.collection.name} #${ask.tokenId}`}
                image=""
                listing={ask}
                link={links[ask.tokenId] ?? `https://opensea.io/item/robinhood/${page.collection.address}/${ask.tokenId}`}
              />
            ))}
          </div>
        </Chapter>
      ) : null}
      <Chapter
        numeral={pictureNumeral}
        kicker="THE SET"
        title="The pictures on this page."
        lede="Held here with the same care as the bag. A listing or an offer shows when the book has one."
      >
        {page.tokens.length === 0 ? <p className="text-mist">No revealed tokens on this page.</p> : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {page.tokens.map((token) => {
            const held = heldIds.includes(token.id);
            return (
              <NftCard
                key={token.id}
                id={token.id}
                name={token.name}
                image={token.image}
                listing={listings[token.id]}
                offer={held ? betterOrder(itemOffers[token.id], bids[0]) : undefined}
                link={links[token.id] ?? `https://opensea.io/item/robinhood/${page.collection.address}/${token.id}`}
              />
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={cursor === null}
            onClick={() => setCursor(null)}
            className="rounded-full border border-line px-4 py-2 text-sm disabled:text-mist"
          >
            First page
          </button>
          <button
            type="button"
            disabled={page.nextCursor === null}
            onClick={() => {
              if (page.nextCursor !== null) setCursor(page.nextCursor);
            }}
            className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink disabled:bg-panel-2 disabled:text-mist"
          >
            Next
          </button>
        </div>
      </Chapter>
    </div>
  );
}
