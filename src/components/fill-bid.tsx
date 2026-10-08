"use client";

import { useState } from "react";
import { NftCard } from "@/components/nft-card";
import type { Listing } from "@/lib/listing";

export function FillBid({
  bid,
  ownedIds,
  contractAddress,
}: {
  bid: Listing;
  ownedIds: string[];
  contractAddress: string;
}) {
  const first = ownedIds[0] ?? "";
  const [tokenId, setTokenId] = useState(first);
  const [seed, setSeed] = useState(first);
  if (first && first !== seed && tokenId === seed) {
    setSeed(first);
    setTokenId(first);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="font-mono text-[11px] tracking-[0.18em] text-lime">OPEN BID</p>
      <p className="mt-1 text-2xl tracking-tight">
        {bid.price} {bid.symbol}
      </p>
      <p className="mt-1 text-sm text-mist">
        Sell a token you hold into this bid. The first click approves the collection to the OpenSea conduit. The second click signs the sale.
      </p>
      <label className="mt-3 block text-xs text-mist">
        Token id
        <input
          value={tokenId}
          inputMode="numeric"
          onChange={(event) => setTokenId(event.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 font-mono text-sm text-paper outline-none"
        />
      </label>
      {ownedIds.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ownedIds.slice(0, 8).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTokenId(id)}
              className="rounded-full border border-line px-3 py-1 text-xs"
            >
              #{id}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-mist">Type an id this wallet holds. OpenSea rejects a sale from any other wallet.</p>
      )}
      <div className="mt-3">
        <NftCard
          id={tokenId}
          name={`#${tokenId || "?"}`}
          image=""
          offer={bid}
          link={`https://opensea.io/item/robinhood/${contractAddress}/${tokenId || "0"}`}
          compact
        />
      </div>
    </div>
  );
}
