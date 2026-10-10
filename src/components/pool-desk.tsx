"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { erc20Abi, getAddress, zeroAddress, type Address, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { robinhood } from "@/config/chain";
import { V3_FACTORY, WETH } from "@/config/contracts";
import { factoryAbi, poolAbi } from "@/config/abis";
import {
  NFT_TOKENS,
  POOL_FEES,
  POSITION_MANAGER,
  positionManagerAbi,
  quoteAsset,
  type NftToken,
  type PoolFee,
  type QuoteSide,
} from "@/config/pools";
import { StoryOpen } from "@/components/story-frame";
import { explorerTx, feeLabel, formatDisplay, parseAmount } from "@/lib/format";
import {
  amountsForDeposit,
  encodeSqrtPriceX96,
  fullRangeTicks,
  rawOutPerWholeIn,
  sortTokens,
} from "@/lib/v3-pool";

const SIDES = ["ETH", "USDG"] as const;

type Market = {
  token: NftToken;
  side: QuoteSide;
  fee: PoolFee;
};

function marketKey(market: Market): string {
  return `${market.token.symbol}:${market.side}:${market.fee}`;
}

function poolIndex(tokenIndex: number, sideIndex: number, feeIndex: number): number {
  return (tokenIndex * SIDES.length + sideIndex) * POOL_FEES.length + feeIndex;
}

export function PoolDesk() {
  const params = useSearchParams();
  const focus = (params.get("token") ?? "").toLowerCase();
  const [market, setMarket] = useState<Market | null>(null);
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();
  const [busy, setBusy] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onRobinhood = chainId === robinhood.id;
  const publicClient = usePublicClient({ chainId: robinhood.id });
  const { switchChain, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const poolContracts = useMemo(
    () =>
      NFT_TOKENS.flatMap((token) =>
        SIDES.flatMap((side) =>
          POOL_FEES.map((fee) => ({
            address: V3_FACTORY,
            abi: factoryAbi,
            functionName: "getPool" as const,
            args: [token.address, quoteAsset(side).poolToken, fee] as const,
          })),
        ),
      ),
    [],
  );
  const poolReads = useReadContracts({
    contracts: poolContracts,
    query: { refetchInterval: 20_000 },
  });

  function poolAddress(tokenIndex: number, side: QuoteSide, fee: PoolFee): Address | null {
    const sideIndex = SIDES.indexOf(side);
    const feeIndex = POOL_FEES.indexOf(fee);
    const row = poolReads.data?.[poolIndex(tokenIndex, sideIndex, feeIndex)];
    if (!row || row.status !== "success") return null;
    return getAddress(row.result);
  }

  const selectedPool =
    market === null
      ? null
      : poolAddress(
          NFT_TOKENS.findIndex((token) => token.symbol === market.token.symbol),
          market.side,
          market.fee,
        );
  const poolLive = Boolean(selectedPool && selectedPool !== zeroAddress);

  const slot = useReadContract({
    address: poolLive && selectedPool ? selectedPool : undefined,
    abi: poolAbi,
    functionName: "slot0",
    query: { enabled: poolLive },
  });

  const quote = market ? quoteAsset(market.side) : null;
  const sorted = market && quote ? sortTokens(market.token.address, quote.poolToken) : null;
  const token0 = sorted?.[0] ?? null;

  const sqrtPrice = useMemo(() => {
    if (!market || !quote || !token0) return null;
    if (poolLive && slot.data && slot.data[0] > 0n) return slot.data[0];
    const nftRaw = parseAmount(price, market.token.decimals);
    if (!nftRaw) return null;
    const quoteRaw = 10n ** BigInt(quote.decimals);
    const token0IsQuote = sameAddress(token0, quote.poolToken);
    try {
      return encodeSqrtPriceX96(token0IsQuote ? nftRaw : quoteRaw, token0IsQuote ? quoteRaw : nftRaw);
    } catch {
      return null;
    }
  }, [market, quote, token0, poolLive, slot.data, price]);

  const depositRaw = market && quote ? parseAmount(deposit, quote.decimals) : null;
  const ticks = market ? fullRangeTicks(market.fee) : null;
  const sized =
    sqrtPrice && ticks && depositRaw && token0 && quote
      ? safeAmounts({
          sqrtPriceX96: sqrtPrice,
          tickLower: ticks.tickLower,
          tickUpper: ticks.tickUpper,
          depositIsToken0: sameAddress(token0, quote.poolToken),
          deposit: depositRaw,
        })
      : null;

  const nftAmount =
    sized && market && token0
      ? sameAddress(token0, market.token.address)
        ? sized.amount0
        : sized.amount1
      : null;
  const quoteAmount =
    sized && quote && token0
      ? sameAddress(token0, quote.poolToken)
        ? sized.amount0
        : sized.amount1
      : null;

  const nftAllowance = useReadContract({
    address: market?.token.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && market ? [address, POSITION_MANAGER] : undefined,
    query: { enabled: Boolean(address && market && onRobinhood) },
  });
  const quoteAllowance = useReadContract({
    address: quote?.address === "native" ? undefined : quote?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && quote && quote.address !== "native" ? [address, POSITION_MANAGER] : undefined,
    query: { enabled: Boolean(address && quote && quote.address !== "native" && onRobinhood) },
  });

  const livePrice =
    market && quote && token0 && poolLive && slot.data && slot.data[0] > 0n
      ? formatDisplay(
          rawOutPerWholeIn(slot.data[0], quote.poolToken, market.token.address, token0, quote.decimals),
          market.token.decimals,
        )
      : null;

  function choose(next: Market) {
    setMarket(next);
    setPrice("");
    setDeposit("");
    setError(null);
    setHash(undefined);
  }

  async function run() {
    if (!market || !quote || !token0 || !ticks || !sqrtPrice || !sized || !nftAmount || !quoteAmount) return;
    if (!isConnected) return;
    if (!onRobinhood) {
      switchChain({ chainId: robinhood.id });
      return;
    }
    if (!publicClient || !address) return;
    setError(null);
    setBusy(true);
    try {
      const [tokenA, tokenB] = sortTokens(market.token.address, quote.poolToken);
      if (!poolLive) {
        const opened = await writeContractAsync({
          address: POSITION_MANAGER,
          abi: positionManagerAbi,
          functionName: "createAndInitializePoolIfNecessary",
          args: [tokenA, tokenB, market.fee, sqrtPrice],
          chainId: robinhood.id,
        });
        setHash(opened);
        await publicClient.waitForTransactionReceipt({ hash: opened });
        await poolReads.refetch();
        return;
      }
      if (nftAllowance.data === undefined || nftAllowance.data < nftAmount) {
        const approved = await writeContractAsync({
          address: market.token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [POSITION_MANAGER, nftAmount],
          chainId: robinhood.id,
        });
        setHash(approved);
        await publicClient.waitForTransactionReceipt({ hash: approved });
        await nftAllowance.refetch();
        return;
      }
      if (quote.address !== "native" && (quoteAllowance.data === undefined || quoteAllowance.data < quoteAmount)) {
        const approved = await writeContractAsync({
          address: quote.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [POSITION_MANAGER, quoteAmount],
          chainId: robinhood.id,
        });
        setHash(approved);
        await publicClient.waitForTransactionReceipt({ hash: approved });
        await quoteAllowance.refetch();
        return;
      }
      const value = sameAddress(tokenA, WETH) ? sized.amount0 : sameAddress(tokenB, WETH) ? sized.amount1 : 0n;
      const minted = await writeContractAsync({
        address: POSITION_MANAGER,
        abi: positionManagerAbi,
        functionName: "mint",
        args: [
          {
            token0: tokenA,
            token1: tokenB,
            fee: market.fee,
            tickLower: ticks.tickLower,
            tickUpper: ticks.tickUpper,
            amount0Desired: sized.amount0,
            amount1Desired: sized.amount1,
            amount0Min: (sized.amount0 * 9_950n) / 10_000n,
            amount1Min: (sized.amount1 * 9_950n) / 10_000n,
            recipient: address,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 20 * 60),
          },
        ],
        value,
        chainId: robinhood.id,
      });
      setHash(minted);
      await publicClient.waitForTransactionReceipt({ hash: minted });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message.slice(0, 180) : "The pool transaction did not send.");
    } finally {
      setBusy(false);
    }
  }

  let actionLabel = "Open the pool";
  let disabled = busy;
  if (!isConnected) {
    actionLabel = "Connect a wallet";
    disabled = true;
  } else if (!onRobinhood) {
    actionLabel = switching ? "Switching" : "Switch to Robinhood";
  } else if (!market || !quote) {
    actionLabel = "Choose a market";
    disabled = true;
  } else if (poolLive && !sqrtPrice) {
    actionLabel = "Reading the pool price";
    disabled = true;
  } else if (!sqrtPrice) {
    actionLabel = "Set the opening price";
    disabled = true;
  } else if (!depositRaw || !sized || !nftAmount || nftAmount === 0n) {
    actionLabel = "Enter a deposit";
    disabled = true;
  } else if (!poolLive) {
    actionLabel = busy ? "Confirm in wallet" : "Create the pool";
  } else if (nftAllowance.data === undefined || nftAllowance.data < nftAmount) {
    actionLabel = busy ? "Confirm in wallet" : `Approve ${market.token.symbol}`;
  } else if (
    quote.address !== "native" &&
    quoteAmount &&
    (quoteAllowance.data === undefined || quoteAllowance.data < quoteAmount)
  ) {
    actionLabel = busy ? "Confirm in wallet" : `Approve ${quote.symbol}`;
  } else {
    actionLabel = busy ? "Confirm in wallet" : "Add liquidity";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <StoryOpen
        numeral="I"
        kicker="THE POOLS"
        title="A market, opened by hand."
        lede="Each pool is a Uniswap v3 pair on Robinhood. You type the price. The wallet opens it. Nothing moves until you confirm."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {NFT_TOKENS.map((token, tokenIndex) => (
          <section
            key={token.symbol}
            className={`rounded-[28px] border bg-panel/95 p-4 ${
              focus === token.symbol.toLowerCase() ? "border-lime/70" : "border-line"
            }`}
          >
            <p className="font-mono text-[11px] tracking-[0.18em] text-gold">{token.symbol}</p>
            <h2 className="mt-1 text-2xl tracking-tight">{token.name}</h2>
            <p className="mt-2 text-sm text-mist">{token.note}</p>
            <div className="mt-4 space-y-3">
              {SIDES.map((side) => (
                <div key={side}>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-mist">AGAINST {side}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {POOL_FEES.map((fee) => {
                      const found = poolAddress(tokenIndex, side, fee);
                      const live = found !== null && found !== zeroAddress;
                      const active = market !== null && marketKey(market) === `${token.symbol}:${side}:${fee}`;
                      return (
                        <button
                          key={fee}
                          type="button"
                          onClick={() => choose({ token, side, fee })}
                          className={`rounded-full border px-3 py-1 font-mono text-xs ${
                            active
                              ? "border-lime bg-lime text-ink"
                              : live
                                ? "border-lime/40 text-lime"
                                : "border-line text-mist"
                          }`}
                        >
                          {feeLabel(fee)} {found === null ? "…" : live ? "open" : "closed"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="trade-sheen mt-6 rounded-[28px] border border-line bg-panel/95 p-4 sm:p-6">
        {market && quote ? (
          <>
            <p className="font-mono text-[11px] tracking-[0.22em] text-lime">
              {market.token.symbol} / {quote.symbol} · {feeLabel(market.fee)}
            </p>
            <h2 className="mt-1 text-2xl tracking-tight">{poolLive ? "Add to this pool" : "Open this pool"}</h2>
            {poolLive ? (
              <p className="mt-3 font-mono text-sm text-paper">
                {livePrice ? (
                  <>
                    1 {quote.symbol} <span className="text-mist">=</span>{" "}
                    <span className="text-lime">{livePrice}</span> {market.token.symbol}
                  </>
                ) : (
                  <span className="text-mist">Reading the pool price…</span>
                )}
              </p>
            ) : (
              <label className="mt-4 block text-sm text-mist">
                Opening price, 1 {quote.symbol} buys
                <span className="mt-2 flex items-center gap-2">
                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`Opening price in ${market.token.symbol}`}
                    className="w-full rounded-2xl border border-line bg-ink px-3 py-3 font-mono text-2xl text-paper outline-none"
                  />
                  <span className="font-mono text-sm text-paper">{market.token.symbol}</span>
                </span>
              </label>
            )}
            <label className="mt-4 block text-sm text-mist">
              You deposit {quote.symbol}
              <input
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                aria-label={`${quote.symbol} deposit`}
                className="mt-2 block w-full rounded-2xl border border-line bg-ink px-3 py-3 font-mono text-2xl text-paper outline-none"
              />
            </label>
            <p className="mt-3 min-h-5 font-mono text-sm text-mist">
              {nftAmount && nftAmount > 0n
                ? `The position takes about ${formatDisplay(nftAmount, market.token.decimals)} ${market.token.symbol} beside that deposit.`
                : "The other side appears once the price and the deposit are set."}
            </p>
            <p className="mt-1 text-xs text-mist">
              Full range. The opening price is the price the pool starts at, and the wallet confirms every step.
            </p>
          </>
        ) : (
          <p className="text-sm text-mist">Pick a fee on a token above. Closed markets can be opened from this desk.</p>
        )}

        <div className="mt-3 min-h-5 font-mono text-xs">
          {error ? <p className="text-danger">{error}</p> : null}
          {hash ? (
            <a className="text-lime underline" href={explorerTx(hash)} target="_blank" rel="noreferrer">
              View the transaction
            </a>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void run()}
          className={`mt-2 w-full rounded-2xl py-3.5 text-base font-semibold tracking-wide ${
            disabled
              ? "cursor-not-allowed bg-panel-2 text-mist"
              : "bg-lime text-ink shadow-[0_0_36px_-8px_rgba(223,242,90,0.95)] hover:brightness-110"
          }`}
        >
          {actionLabel}
        </button>
      </section>
    </div>
  );
}

function sameAddress(left: Address, right: Address): boolean {
  return getAddress(left) === getAddress(right);
}

function safeAmounts(input: Parameters<typeof amountsForDeposit>[0]) {
  try {
    return amountsForDeposit(input);
  } catch {
    return null;
  }
}
