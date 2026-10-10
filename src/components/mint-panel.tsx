"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  zeroAddress,
  zeroHash,
  BaseError,
  type Address,
  type Hex,
} from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { findCollection } from "@/data/collections";
import { robinhood } from "@/config/chain";
import {
  SEA_DROP,
  hashcatAbi,
  hoodieAbi,
  liveMintAbi,
  pricedMintAbi,
  seaDropAbi,
  seaDropNftAbi,
  spriteAbi,
  stageMintAbi,
  supplyAbi,
} from "@/config/mint";
import { explorerTx, formatCount, formatDisplay } from "@/lib/format";
import { hashcatEffort, hashcatSearchable, hashcatWork, HASHCAT_SEARCH_LIMIT } from "@/lib/hashcat";

type SupplyFn = "totalSupply" | "totalMinted";

type MintSpec =
  | { kind: "seadrop"; supply: SupplyFn }
  | { kind: "priced" }
  | { kind: "live" }
  | { kind: "stage" }
  | { kind: "hoodie" }
  | { kind: "sprite" }
  | { kind: "hashcat" }
  | { kind: "note"; detail: string; readSupply: boolean };

function specFor(slug: string): MintSpec | null {
  switch (slug) {
    case "rare-friends-genesis":
      return { kind: "seadrop", supply: "totalMinted" };
    case "dogihood":
      return { kind: "seadrop", supply: "totalSupply" };
    case "ccff00":
      return { kind: "priced" };
    case "chain-mancers":
      return { kind: "live" };
    case "stonkbrokers":
      return { kind: "stage" };
    case "onchainhoodies":
      return { kind: "hoodie" };
    case "spritehood":
      return { kind: "sprite" };
    case "hashcats":
      return { kind: "hashcat" };
    case "cash-cats":
      return {
        kind: "note",
        readSupply: true,
        detail: "The mint entry on this contract expects a claim proof, so there is no public button here.",
      };
    case "rh-machines":
      return {
        kind: "note",
        readSupply: true,
        detail: "A minter role creates these machines. The contract has no public mint.",
      };
    case "pitboys":
      return {
        kind: "note",
        readSupply: false,
        detail: "PitBoys arrived by bridge. The contract has no public mint.",
      };
    default:
      return null;
  }
}

function formatWhen(unix: bigint | number): string {
  return new Date(Number(unix) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mintError(reason: unknown): string {
  const text = reason instanceof BaseError ? reason.shortMessage : reason instanceof Error ? reason.message : "";
  if (/rejected|denied/i.test(text)) return "The wallet rejected the mint.";
  if (/insufficient funds/i.test(text)) return "The wallet does not hold the mint price.";
  if (/reverted/i.test(text)) return "The contract rejected the mint.";
  if (text) return text.slice(0, 180);
  return "The mint did not send.";
}

function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

type MintCall = {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
};

function useMintSend() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: robinhood.id });
  const { switchChain, isPending: switching } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();

  function ready(): boolean {
    if (!address) {
      setError("Connect a wallet on Robinhood Chain to mint.");
      return false;
    }
    if (chainId !== robinhood.id) {
      switchChain({ chainId: robinhood.id });
      return false;
    }
    return true;
  }

  async function send(variables: MintCall) {
    if (!ready()) return;
    if (!publicClient || !address) {
      setError("The chain client is still starting.");
      return;
    }
    setError(null);
    const simulation = {
      account: address,
      address: variables.address,
      abi: variables.abi,
      functionName: variables.functionName,
      args: variables.args,
      value: variables.value,
    } as unknown as Parameters<typeof publicClient.simulateContract>[0];
    const write = {
      chainId: robinhood.id,
      address: variables.address,
      abi: variables.abi,
      functionName: variables.functionName,
      args: variables.args,
      value: variables.value,
    } as unknown as Parameters<typeof writeContractAsync>[0];
    try {
      await publicClient.simulateContract(simulation);
      const sent = await writeContractAsync(write);
      setHash(sent);
    } catch (reason) {
      setError(mintError(reason));
    }
  }

  return { address, chainId, switching, pending: isPending, error, hash, ready, send };
}

function MintFrame({
  status,
  detail,
  children,
}: {
  status: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <section className="trade-sheen mt-6 rounded-[28px] border border-line bg-panel p-4 md:p-5">
      <p className="font-mono text-[11px] tracking-[0.22em] text-gold">MINT</p>
      <h2 className="mt-2 text-2xl tracking-tight">{status}</h2>
      <p className="mt-2 max-w-2xl text-sm text-mist">{detail}</p>
      {children}
    </section>
  );
}

function MintResult({ error, hash }: { error: string | null; hash: Hex | undefined }) {
  return (
    <>
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
      {hash ? (
        <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-lime">
          Mint sent
        </a>
      ) : null}
    </>
  );
}

function QtyMint({
  maxQty,
  label,
  busy,
  onMint,
}: {
  maxQty: number;
  label: string;
  busy: boolean;
  onMint: (quantity: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const safe = Math.min(Math.max(qty, 1), maxQty);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="text-xs text-mist">
        Quantity
        <input
          type="number"
          min={1}
          max={maxQty}
          value={safe}
          aria-label="Mint quantity"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next) && next > 0) setQty(next);
          }}
          className="mt-1 block w-20 rounded-xl border border-line bg-ink px-2 py-2 text-center font-mono text-sm text-paper"
        />
      </label>
      <button
        type="button"
        disabled={busy || maxQty < 1}
        onClick={() => onMint(safe)}
        className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:bg-panel-2 disabled:text-mist"
      >
        {label}
      </button>
    </div>
  );
}

function priceText(wei: bigint, quantity: number): string {
  if (wei === 0n) return "Free";
  return `${formatDisplay(wei * BigInt(quantity), 18)} ETH`;
}

export function MintPanel({ slug }: { slug: string }) {
  const spec = specFor(slug);
  const collection = findCollection(slug);
  if (!spec || !collection) return null;
  switch (spec.kind) {
    case "seadrop":
      return <SeaDropMint nft={collection.address} supplyFn={spec.supply} />;
    case "priced":
      return <PricedMint nft={collection.address} />;
    case "live":
      return <LiveMint nft={collection.address} />;
    case "stage":
      return <StageMint nft={collection.address} />;
    case "hoodie":
      return <HoodieMint nft={collection.address} />;
    case "sprite":
      return <SpriteMint nft={collection.address} />;
    case "hashcat":
      return <HashcatMint nft={collection.address} />;
    case "note":
      return <NoteMint nft={collection.address} detail={spec.detail} readSupply={spec.readSupply} />;
    default: {
      const unknown: never = spec;
      return unknown;
    }
  }
}

function SeaDropMint({ nft, supplyFn }: { nft: Address; supplyFn: SupplyFn }) {
  const now = useNow();
  const mint = useMintSend();
  const drop = useReadContract({
    address: SEA_DROP,
    abi: seaDropAbi,
    functionName: "getPublicDrop",
    args: [nft],
    query: { refetchInterval: 20_000 },
  });
  const fees = useReadContract({
    address: SEA_DROP,
    abi: seaDropAbi,
    functionName: "getAllowedFeeRecipients",
    args: [nft],
    query: { refetchInterval: 20_000 },
  });
  const minted = useReadContract({
    address: nft,
    abi: seaDropNftAbi,
    functionName: supplyFn,
    query: { refetchInterval: 20_000 },
  });
  const max = useReadContract({
    address: nft,
    abi: seaDropNftAbi,
    functionName: "maxSupply",
    query: { refetchInterval: 20_000 },
  });
  const stats = useReadContract({
    address: nft,
    abi: seaDropNftAbi,
    functionName: "getMintStats",
    args: mint.address ? [mint.address] : undefined,
    query: { enabled: Boolean(mint.address), refetchInterval: 20_000 },
  });

  if (now === null || drop.isPending || fees.isPending || minted.isPending || max.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract for the public drop." />;
  }
  if (!drop.data || !fees.data || minted.data === undefined || max.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return a public drop." />;
  }

  const price = drop.data[0];
  const start = drop.data[1];
  const end = drop.data[2];
  const perWallet = Number(drop.data[3]);
  const feeRecipient = fees.data[0];
  const already = stats.data ? Number(stats.data[0]) : 0;
  const leftWallet = Math.max(perWallet - already, 0);
  const leftSupply = minted.data >= max.data ? 0 : Number(max.data - minted.data);
  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(max.data))} minted.`;
  const windowSet = Number(start) > 0 && Number(end) > Number(start);
  const inWindow = windowSet && now >= Number(start) && now < Number(end);
  const feeReady = !drop.data[5] || Boolean(feeRecipient);
  const open = inWindow && leftSupply > 0 && leftWallet > 0 && feeReady;
  const maxQty = Math.min(leftWallet, leftSupply, 20);

  let status = "Mint is closed";
  let detail = supplyLine;
  if (!windowSet) {
    status = "No public drop";
    detail = `${supplyLine} The collection has no public mint window on its drop contract.`;
  } else if (now < Number(start)) {
    status = "Mint opens later";
    detail = `${supplyLine} The public window opens ${formatWhen(start)}. Price ${priceText(price, 1)}.`;
  } else if (now >= Number(end)) {
    status = "Mint window ended";
    detail = `${supplyLine} The public window ended ${formatWhen(end)}.`;
  } else if (leftSupply === 0) {
    status = "Minted out";
    detail = `${supplyLine} The contract has no supply left.`;
  } else if (!feeReady) {
    status = "Mint is closed";
    detail = `${supplyLine} The drop has no fee recipient, so the contract will not mint.`;
  } else if (leftWallet === 0) {
    status = "Wallet limit reached";
    detail = `${supplyLine} This wallet already minted its ${formatCount(perWallet)}.`;
  } else {
    status = `Mint · ${priceText(price, 1)}`;
    detail = `${supplyLine} Up to ${formatCount(perWallet)} per wallet. The wallet calls the drop contract this collection allows, and the NFT lands here.`;
  }

  const busy = mint.pending || mint.switching;
  let label = `Mint · ${priceText(price, 1)}`;
  if (mint.address && mint.chainId !== robinhood.id) label = mint.switching ? "Switching" : "Switch network";
  if (mint.pending) label = "Confirm in wallet";

  return (
    <MintFrame status={status} detail={detail}>
      {open && feeRecipient ? (
        <QtyMint
          maxQty={maxQty}
          label={label}
          busy={busy}
          onMint={(quantity) => {
            void mint.send({
              address: SEA_DROP,
              abi: seaDropAbi,
              functionName: "mintPublic",
              args: [nft, feeRecipient, zeroAddress, BigInt(quantity)],
              value: price * BigInt(quantity),
            });
          }}
        />
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function PricedMint({ nft }: { nft: Address }) {
  const mint = useMintSend();
  const price = useReadContract({ address: nft, abi: pricedMintAbi, functionName: "MINT_PRICE", query: { refetchInterval: 20_000 } });
  const openFlag = useReadContract({ address: nft, abi: pricedMintAbi, functionName: "publicSaleOpen", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: pricedMintAbi, functionName: "publicMinted", query: { refetchInterval: 20_000 } });
  const cap = useReadContract({ address: nft, abi: pricedMintAbi, functionName: "PUBLIC_SUPPLY", query: { refetchInterval: 20_000 } });
  const perMint = useReadContract({ address: nft, abi: pricedMintAbi, functionName: "MAX_PER_MINT", query: { refetchInterval: 20_000 } });

  if (price.isPending || openFlag.isPending || minted.isPending || cap.isPending || perMint.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract for the public sale." />;
  }
  if (price.data === undefined || openFlag.data === undefined || minted.data === undefined || cap.data === undefined || perMint.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return its public sale." />;
  }

  const left = minted.data >= cap.data ? 0 : Number(cap.data - minted.data);
  const maxQty = Math.min(left, Number(perMint.data));
  const open = openFlag.data && left > 0;
  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(cap.data))} public mints are out.`;
  const status = open ? `Mint · ${priceText(price.data, 1)}` : left === 0 ? "Public supply is minted" : "Public sale is closed";
  const detail = open
    ? `${supplyLine} Up to ${formatCount(Number(perMint.data))} at a time. The wallet calls mint on this contract.`
    : left === 0
      ? `${supplyLine} The contract rejects another public mint.`
      : `${supplyLine} The public sale flag is closed.`;
  const busy = mint.pending || mint.switching;
  let label = `Mint · ${priceText(price.data, 1)}`;
  if (mint.address && mint.chainId !== robinhood.id) label = mint.switching ? "Switching" : "Switch network";
  if (mint.pending) label = "Confirm in wallet";

  return (
    <MintFrame status={status} detail={detail}>
      {open ? (
        <QtyMint
          maxQty={Math.max(maxQty, 1)}
          label={label}
          busy={busy}
          onMint={(quantity) => {
            void mint.send({
              address: nft,
              abi: pricedMintAbi,
              functionName: "mint",
              args: [BigInt(quantity)],
              value: price.data * BigInt(quantity),
            });
          }}
        />
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function LiveMint({ nft }: { nft: Address }) {
  const mint = useMintSend();
  const live = useReadContract({ address: nft, abi: liveMintAbi, functionName: "mintLive", query: { refetchInterval: 20_000 } });
  const ended = useReadContract({ address: nft, abi: liveMintAbi, functionName: "mintEnded", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: liveMintAbi, functionName: "totalSupply", query: { refetchInterval: 20_000 } });
  const cap = useReadContract({ address: nft, abi: liveMintAbi, functionName: "MAX_SUPPLY", query: { refetchInterval: 20_000 } });

  if (live.isPending || ended.isPending || minted.isPending || cap.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract if minting is live." />;
  }
  if (live.data === undefined || ended.data === undefined || minted.data === undefined || cap.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return its mint window." />;
  }

  const left = minted.data >= cap.data ? 0 : Number(cap.data - minted.data);
  const open = live.data && !ended.data && left > 0;
  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(cap.data))} minted.`;
  const status = open ? "Mint is live" : ended.data || left === 0 ? "Mint has ended" : "Mint is not live";
  const detail = open
    ? `${supplyLine} The wallet calls mint on this contract.`
    : `${supplyLine} ${ended.data || left === 0 ? "The mint window on the contract is over." : "The contract says minting is not live."}`;

  return (
    <MintFrame status={status} detail={detail}>
      {open ? (
        <QtyMint
          maxQty={Math.min(left, 20)}
          label={mint.pending ? "Confirm in wallet" : mint.address && mint.chainId !== robinhood.id ? (mint.switching ? "Switching" : "Switch network") : "Mint"}
          busy={mint.pending || mint.switching}
          onMint={(quantity) => {
            void mint.send({
              address: nft,
              abi: liveMintAbi,
              functionName: "mint",
              args: [BigInt(quantity)],
              value: 0n,
            });
          }}
        />
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function StageMint({ nft }: { nft: Address }) {
  const mint = useMintSend();
  const price = useReadContract({ address: nft, abi: stageMintAbi, functionName: "MINT_PRICE", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: stageMintAbi, functionName: "totalSupply", query: { refetchInterval: 20_000 } });
  const cap = useReadContract({ address: nft, abi: stageMintAbi, functionName: "MAX_SUPPLY", query: { refetchInterval: 20_000 } });
  const stage0 = useReadContract({ address: nft, abi: stageMintAbi, functionName: "stageActive", args: [0], query: { refetchInterval: 20_000 } });
  const stage1 = useReadContract({ address: nft, abi: stageMintAbi, functionName: "stageActive", args: [1], query: { refetchInterval: 20_000 } });
  const stage2 = useReadContract({ address: nft, abi: stageMintAbi, functionName: "stageActive", args: [2], query: { refetchInterval: 20_000 } });

  if (price.isPending || minted.isPending || cap.isPending || stage0.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract which mint stage is active." />;
  }
  if (price.data === undefined || minted.data === undefined || cap.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return its mint stage." />;
  }

  const active = stage0.data ? 0 : stage1.data ? 1 : stage2.data ? 2 : null;
  const left = minted.data >= cap.data ? 0 : Number(cap.data - minted.data);
  const open = active !== null && left > 0;
  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(cap.data))} minted.`;
  const status = open ? `Mint · ${priceText(price.data, 1)}` : left === 0 ? "Minted out" : "No mint stage is active";
  const detail = open
    ? `${supplyLine} Stage ${active} is active. The wallet calls mint on this contract.`
    : left === 0
      ? `${supplyLine} The contract has no supply left.`
      : `${supplyLine} None of the mint stages are active.`;

  return (
    <MintFrame status={status} detail={detail}>
      {open && active !== null ? (
        <QtyMint
          maxQty={Math.min(left, 20)}
          label={mint.pending ? "Confirm in wallet" : mint.address && mint.chainId !== robinhood.id ? (mint.switching ? "Switching" : "Switch network") : `Mint · ${priceText(price.data, 1)}`}
          busy={mint.pending || mint.switching}
          onMint={(quantity) => {
            void mint.send({
              address: nft,
              abi: stageMintAbi,
              functionName: "mint",
              args: [active, BigInt(quantity)],
              value: price.data * BigInt(quantity),
            });
          }}
        />
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function HoodieMint({ nft }: { nft: Address }) {
  const now = useNow();
  const mint = useMintSend();
  const ended = useReadContract({ address: nft, abi: hoodieAbi, functionName: "didMintEnd", query: { refetchInterval: 20_000 } });
  const paused = useReadContract({ address: nft, abi: hoodieAbi, functionName: "mintingPaused", query: { refetchInterval: 20_000 } });
  const phaseId = useReadContract({ address: nft, abi: hoodieAbi, functionName: "currentPhaseId", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: hoodieAbi, functionName: "totalSupply", query: { refetchInterval: 20_000 } });
  const cap = useReadContract({ address: nft, abi: hoodieAbi, functionName: "maxSupply", query: { refetchInterval: 20_000 } });
  const phase = useReadContract({
    address: nft,
    abi: hoodieAbi,
    functionName: "phases",
    args: phaseId.data !== undefined ? [phaseId.data] : undefined,
    query: { enabled: phaseId.data !== undefined, refetchInterval: 20_000 },
  });

  if (now === null || ended.isPending || paused.isPending || minted.isPending || cap.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract if a mint phase is open." />;
  }
  if (ended.data === undefined || paused.data === undefined || minted.data === undefined || cap.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return its mint phase." />;
  }

  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(cap.data))} minted.`;
  const phaseReady = phase.data !== undefined && phase.data[1] > 0n;
  const allowlist = phase.data !== undefined && phase.data[7] !== zeroHash;
  const inWindow = phase.data !== undefined && now >= Number(phase.data[1]) && now < Number(phase.data[2]);
  const left = minted.data >= cap.data ? 0 : Number(cap.data - minted.data);
  const open = !ended.data && !paused.data && phaseReady && !allowlist && inWindow && left > 0 && phase.data !== undefined;
  const price = phase.data?.[3] ?? 0n;
  const perWallet = phase.data ? Number(phase.data[4]) : 0;

  let status = "Mint has ended";
  let detail = `${supplyLine} The mint on this contract has ended.`;
  if (!ended.data && paused.data) {
    status = "Mint is paused";
    detail = `${supplyLine} Minting is paused on the contract.`;
  } else if (!ended.data && allowlist && inWindow) {
    status = "Allowlist phase";
    detail = `${supplyLine} This phase asks for an allowlist proof the desk does not hold.`;
  } else if (open) {
    status = `Mint · ${priceText(price, 1)}`;
    detail = `${supplyLine} Up to ${formatCount(perWallet)} per wallet. The wallet calls mint on this contract.`;
  } else if (!ended.data) {
    status = "No public phase";
    detail = `${supplyLine} No public mint phase is active on the contract.`;
  }

  return (
    <MintFrame status={status} detail={detail}>
      {open ? (
        <QtyMint
          maxQty={Math.min(left, Math.max(perWallet, 1), 20)}
          label={mint.pending ? "Confirm in wallet" : mint.address && mint.chainId !== robinhood.id ? (mint.switching ? "Switching" : "Switch network") : `Mint · ${priceText(price, 1)}`}
          busy={mint.pending || mint.switching}
          onMint={(quantity) => {
            void mint.send({
              address: nft,
              abi: hoodieAbi,
              functionName: "mint",
              args: [BigInt(quantity)],
              value: price * BigInt(quantity),
            });
          }}
        />
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function SpriteMint({ nft }: { nft: Address }) {
  const openFlag = useReadContract({ address: nft, abi: spriteAbi, functionName: "mintOpen", query: { refetchInterval: 20_000 } });
  const paused = useReadContract({ address: nft, abi: spriteAbi, functionName: "paused", query: { refetchInterval: 20_000 } });
  const closed = useReadContract({ address: nft, abi: spriteAbi, functionName: "mintingClosed", query: { refetchInterval: 20_000 } });
  const remaining = useReadContract({ address: nft, abi: spriteAbi, functionName: "remainingSupply", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: spriteAbi, functionName: "totalSupply", query: { refetchInterval: 20_000 } });
  const cap = useReadContract({ address: nft, abi: spriteAbi, functionName: "MAX_SUPPLY", query: { refetchInterval: 20_000 } });

  if (closed.isPending || minted.isPending || cap.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the collection contract if minting is still open." />;
  }
  if (closed.data === undefined || minted.data === undefined || cap.data === undefined) {
    return <MintFrame status="Mint unread" detail="The collection contract did not return its mint status." />;
  }

  const supplyLine = `${formatCount(Number(minted.data))} of ${formatCount(Number(cap.data))} minted.`;
  const soldOut = remaining.data === 0n || minted.data >= cap.data;
  let status = "Mint is closed";
  let detail = `${supplyLine} Minting is closed on the contract.`;
  if (soldOut || closed.data) {
    status = "Mint is closed";
    detail = `${supplyLine} Minting is closed on the contract.`;
  } else if (paused.data) {
    status = "Mint is paused";
    detail = `${supplyLine} Minting is paused on the contract.`;
  } else if (openFlag.data) {
    status = "Mint flag is open";
    detail = `${supplyLine} The contract says minting is open. The public mint function for this set is not on the desk yet.`;
  } else {
    status = "Mint is not open";
    detail = `${supplyLine} The contract says minting is not open.`;
  }
  return <MintFrame status={status} detail={detail} />;
}

type HashJob = {
  miner: Address;
  prevWork: bigint;
  anchorBlock: bigint;
  anchor: Hex;
  target: bigint;
  value: bigint;
};

function HashcatMint({ nft }: { nft: Address }) {
  const mint = useMintSend();
  const sendRef = useRef(mint.send);
  sendRef.current = mint.send;
  const [job, setJob] = useState<HashJob | null>(null);
  const [searched, setSearched] = useState(0);
  const price = useReadContract({ address: nft, abi: hashcatAbi, functionName: "mintPrice", query: { refetchInterval: 20_000 } });
  const minted = useReadContract({ address: nft, abi: hashcatAbi, functionName: "totalMinted", query: { refetchInterval: 20_000 } });
  const target = useReadContract({ address: nft, abi: hashcatAbi, functionName: "currentTarget", query: { refetchInterval: 20_000 } });
  const last = useReadContract({ address: nft, abi: hashcatAbi, functionName: "lastMintTime", query: { refetchInterval: 20_000 } });
  const prev = useReadContract({ address: nft, abi: hashcatAbi, functionName: "prevWork", query: { refetchInterval: 20_000 } });
  const anchor = useReadContract({ address: nft, abi: hashcatAbi, functionName: "currentAnchor", query: { refetchInterval: 20_000 } });

  useEffect(() => {
    if (!job) return;
    const current = job;
    let nonce = BigInt(Math.floor(Math.random() * 0xffffffff));
    let seen = 0;
    let stopped = false;
    let timer = 0;

    const step = () => {
      if (stopped) return;
      const end = nonce + 1500n;
      for (; nonce < end; nonce += 1n) {
        seen += 1;
        const work = BigInt(hashcatWork(current.miner, nonce, current.prevWork, current.anchor));
        if (work < current.target) {
          setJob(null);
          setSearched(seen);
          void sendRef.current({
            address: nft,
            abi: hashcatAbi,
            functionName: "mine",
            args: [nonce, current.anchorBlock],
            value: current.value,
          });
          return;
        }
      }
      setSearched(seen);
      if (BigInt(seen) >= HASHCAT_SEARCH_LIMIT) {
        setJob(null);
        return;
      }
      timer = window.setTimeout(step, 0);
    };
    timer = window.setTimeout(step, 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [job, nft]);

  if (price.isPending || minted.isPending || target.isPending || last.isPending) {
    return <MintFrame status="Reading the mint" detail="The desk is asking the Hashcats contract for the live price and target." />;
  }
  if (price.data === undefined || minted.data === undefined || target.data === undefined || last.data === undefined) {
    return <MintFrame status="Mint unread" detail="The Hashcats contract did not return its mint price." />;
  }

  const searchable = hashcatSearchable(target.data);
  const bits = hashcatEffort(target.data).toString(2).length - 1;
  const status = `Mine · ${priceText(price.data, 1)}`;
  const detail = searchable
    ? `${formatCount(Number(minted.data))} cats are minted. The last one landed ${formatWhen(last.data)}. Search finds a hash under the target, then the wallet calls mine() and pays ${priceText(price.data, 1)}.`
    : `${formatCount(Number(minted.data))} cats are minted. The last one landed ${formatWhen(last.data)}. mine() still takes ${priceText(price.data, 1)}, and the target takes on the order of 2^${bits} hashes. A search on this page will not finish in a sitting.`;

  return (
    <MintFrame status={status} detail={detail}>
      {searchable ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={job !== null || mint.pending || mint.switching}
            onClick={() => {
              if (!mint.ready() || !mint.address || prev.data === undefined || !anchor.data || target.data === undefined || price.data === undefined) return;
              setSearched(0);
              setJob({
                miner: mint.address,
                prevWork: prev.data,
                anchorBlock: anchor.data[0],
                anchor: anchor.data[1],
                target: target.data,
                value: price.data,
              });
            }}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:bg-panel-2 disabled:text-mist"
          >
            {job ? `Searching · ${formatCount(searched)}` : mint.pending ? "Confirm in wallet" : "Search, then mint"}
          </button>
          {job ? (
            <button type="button" onClick={() => setJob(null)} className="text-sm text-mist">
              Stop
            </button>
          ) : null}
        </div>
      ) : null}
      <MintResult error={mint.error} hash={mint.hash} />
    </MintFrame>
  );
}

function NoteMint({ nft, detail, readSupply }: { nft: Address; detail: string; readSupply: boolean }) {
  const supply = useReadContract({
    address: nft,
    abi: supplyAbi,
    functionName: "totalSupply",
    query: { enabled: readSupply, refetchInterval: 20_000 },
  });
  const count = supply.data !== undefined ? `${formatCount(Number(supply.data))} minted. ` : "";
  return <MintFrame status="No public mint" detail={`${count}${detail}`} />;
}
