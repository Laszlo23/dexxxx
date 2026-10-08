"use client";

import { useState } from "react";
import { erc20Abi, type Address, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { erc721Abi } from "@/config/abis";
import { robinhood } from "@/config/chain";
import { explorerTx } from "@/lib/format";
import type { Listing } from "@/lib/listing";
import { NftImage } from "@/components/nft-image";

export type { Listing };

export function NftCard({
  id,
  name,
  image,
  listing,
  offer,
  link,
  compact = false,
}: {
  id: string;
  name: string;
  image: string;
  listing?: Listing;
  offer?: Listing;
  link: string;
  compact?: boolean;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: robinhood.id });
  const { switchChain, isPending: switching } = useSwitchChain();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: approving } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();
  const [selling, setSelling] = useState(false);

  const paymentToken = listing?.paymentToken ?? undefined;
  const spender = listing?.spender ?? undefined;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: paymentToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: Boolean(address && paymentToken && spender && chainId === robinhood.id) },
  });
  const nft = offer?.nft ?? undefined;
  const operator = offer?.spender ?? undefined;
  const { data: approvedForAll, refetch: refetchApproved } = useReadContract({
    address: nft,
    abi: erc721Abi,
    functionName: "isApprovedForAll",
    args: address && operator ? [address, operator] : undefined,
    query: { enabled: Boolean(address && nft && operator && chainId === robinhood.id) },
  });
  const checkingApproval = Boolean(
    paymentToken && address && chainId === robinhood.id && allowance === undefined,
  );
  const checkingOperator = Boolean(
    offer && nft && operator && address && chainId === robinhood.id && approvedForAll === undefined,
  );
  const needsApproval = Boolean(
    listing &&
      paymentToken &&
      spender &&
      allowance !== undefined &&
      allowance < BigInt(listing.paymentAmount),
  );

  async function buy() {
    if (!listing) return;
    if (!address) {
      setError("Connect a wallet on Robinhood Chain to buy.");
      return;
    }
    if (chainId !== robinhood.id) {
      switchChain({ chainId: robinhood.id });
      return;
    }
    setError(null);
    if (needsApproval && paymentToken && spender) {
      try {
        const approved = await writeContractAsync({
          address: paymentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, BigInt(listing.paymentAmount)],
          chainId: robinhood.id,
        });
        setHash(approved);
        await refetchAllowance();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Approval was rejected.");
      }
      return;
    }
    const response = await fetch("/api/fulfill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hash: listing.hash,
        protocolAddress: listing.protocolAddress,
        fulfiller: address,
      }),
    });
    const body = (await response.json()) as {
      to?: Address;
      data?: Hex;
      value?: string;
      error?: string;
    };
    if (!response.ok || !body.to || !body.data) {
      setError(body.error ?? "OpenSea could not build this purchase.");
      return;
    }
    try {
      const sent = await sendTransactionAsync({
        to: body.to,
        data: body.data,
        value: BigInt(body.value ?? "0"),
        chainId: robinhood.id,
      });
      setHash(sent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The wallet rejected the purchase.");
    }
  }

  async function sell() {
    if (!offer?.nft) return;
    if (!/^\d+$/.test(id)) {
      setError("Enter the token id you want to sell.");
      return;
    }
    if (!address) {
      setError("Connect a wallet that holds this NFT to sell it.");
      return;
    }
    if (chainId !== robinhood.id) {
      switchChain({ chainId: robinhood.id });
      return;
    }
    if (!operator) {
      setError("OpenSea did not return the conduit for this bid.");
      return;
    }
    setError(null);
    setSelling(true);
    try {
      if (!approvedForAll) {
        const approved = await writeContractAsync({
          address: offer.nft,
          abi: erc721Abi,
          functionName: "setApprovalForAll",
          args: [operator, true],
          chainId: robinhood.id,
        });
        setHash(approved);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approved });
        await refetchApproved();
        return;
      }
      const response = await fetch("/api/fulfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          side: "offer",
          hash: offer.hash,
          protocolAddress: offer.protocolAddress,
          fulfiller: address,
          nft: offer.nft,
          tokenId: id,
        }),
      });
      const body = (await response.json()) as {
        to?: Address;
        data?: Hex;
        value?: string;
        error?: string;
      };
      if (!response.ok || !body.to || !body.data) {
        setError(body.error ?? "OpenSea could not build this sale.");
        return;
      }
      const sent = await sendTransactionAsync({
        to: body.to,
        data: body.data,
        value: BigInt(body.value ?? "0"),
        chainId: robinhood.id,
      });
      setHash(sent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The wallet rejected the sale.");
    } finally {
      setSelling(false);
    }
  }

  const needsNftApproval = Boolean(offer && operator && approvedForAll === false);
  let sellLabel = offer ? `Sell · ${offer.price} ${offer.symbol}` : "Sell";
  if (offer && address && chainId !== robinhood.id) sellLabel = switching ? "Switching" : "Switch network";
  if (needsNftApproval && address && chainId === robinhood.id) {
    sellLabel = approving || selling ? "Approving NFT" : "Approve NFT";
  }
  if (checkingOperator) sellLabel = "Checking approval";
  if (selling && approvedForAll) sellLabel = "Confirm in wallet";

  let label = listing ? `Buy · ${listing.price} ${listing.symbol}` : "Open listing";
  if (listing && !address) label = `Buy · ${listing.price} ${listing.symbol}`;
  if (listing && address && chainId !== robinhood.id) label = switching ? "Switching" : "Switch network";
  if (listing && needsApproval && address && chainId === robinhood.id) {
    label = approving ? `Approving ${listing.symbol}` : `Approve ${listing.symbol}`;
  }
  if (checkingApproval) label = `Checking ${listing?.symbol ?? "balance"}`;
  if (sending) label = "Confirm in wallet";

  return (
    <article className={compact ? "space-y-2" : "overflow-hidden rounded-2xl border border-line bg-panel"}>
      {compact ? null : (
        <div className="aspect-square bg-panel-2">
          {image ? (
            <NftImage src={image} alt={name || `#${id}`} />
          ) : (
            <div className="grid h-full place-items-center font-mono text-3xl text-gold">#{id}</div>
          )}
        </div>
      )}
      <div className={compact ? "space-y-2" : "space-y-2 p-3"}>
        {compact ? null : (
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm">{name || `#${id}`}</h3>
            <span className="font-mono text-[11px] text-mist">#{id}</span>
          </div>
        )}
        {offer ? (
          <button
            type="button"
            disabled={checkingOperator || approving || selling || sending || !/^\d+$/.test(id)}
            onClick={() => {
              void sell();
            }}
            className="w-full rounded-xl bg-lime py-2 text-sm font-semibold text-ink disabled:bg-panel-2 disabled:text-mist"
          >
            {sellLabel}
          </button>
        ) : null}
        {listing ? (
          <button
            type="button"
            disabled={checkingApproval || approving || sending}
            onClick={() => {
              void buy();
            }}
            className="w-full rounded-xl bg-gold py-2 text-sm font-semibold text-ink disabled:bg-panel-2 disabled:text-mist"
          >
            {label}
          </button>
        ) : offer ? null : (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-line py-2 text-center text-sm text-paper"
          >
            Open listing
          </a>
        )}
        <a href={link} target="_blank" rel="noreferrer" className="block text-center text-xs text-mist">
          OpenSea
        </a>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {hash ? (
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="block text-xs text-lime">
            Transaction sent
          </a>
        ) : null}
      </div>
    </article>
  );
}
