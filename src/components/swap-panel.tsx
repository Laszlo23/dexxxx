"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { erc20Abi, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { robinhood } from "@/config/chain";
import { SWAP_ROUTER_02 } from "@/config/contracts";
import { findToken, TOKEN_GROUPS, TOKENS, type Token, type TokenGroup } from "@/config/tokens";
import { explorerTx, feeLabel, formatDisplay, parseAmount, slippageBps } from "@/lib/format";
import { buildSwapCall } from "@/lib/swap-call";

type QuoteBody = {
  fee: number;
  amountOut: string;
  amountOutMinimum: string;
  amountOutDisplay: string;
  minimumDisplay: string;
  priceImpactBps: number;
  twapDisplay: string | null;
  twapWindow: number | null;
  twapGapBps: number | null;
  amount: string;
  sell: string;
  buy: string;
  slippage: string;
};

const PAIRS = [
  ["ETH", "USDG"],
  ["USDG", "NVDA"],
  ["ETH", "SPY"],
  ["USDG", "TSLA"],
  ["USDG", "AAPL"],
] as const;

const SLIPPAGE_PRESETS = ["0.1", "0.5", "1"] as const;

function otherToken(symbol: string): Token {
  return TOKENS.find((token) => token.symbol !== symbol) ?? TOKENS[1];
}

function sizesFor(group: TokenGroup, symbol: string): string[] {
  switch (group) {
    case "Cash":
      return symbol === "ETH" ? ["0.01", "0.1", "1"] : ["25", "100", "500"];
    case "Desk":
      return ["1000", "10000", "100000"];
    case "Stocks":
    case "Funds":
      return ["0.1", "1", "5"];
    default: {
      const unknown: never = group;
      return unknown;
    }
  }
}

function chipLabel(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("en-US");
}

function unitRate(amountIn: bigint, amountOut: string, sell: Token, buy: Token): string {
  const perOne = (BigInt(amountOut) * 10n ** BigInt(sell.decimals)) / amountIn;
  return formatDisplay(perOne, buy.decimals);
}

export function SwapPanel() {
  const params = useSearchParams();
  const initialSell = findToken(params.get("sell") ?? "") ?? TOKENS[0];
  const requestedBuy = findToken(params.get("buy") ?? "");
  const initialBuy =
    requestedBuy && requestedBuy.symbol !== initialSell.symbol
      ? requestedBuy
      : otherToken(initialSell.symbol);

  const [sell, setSell] = useState<Token>(initialSell);
  const [buy, setBuy] = useState<Token>(initialBuy);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState<QuoteBody | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | undefined>();
  const [flipped, setFlipped] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();
  const { writeContractAsync, isPending: approving } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const amountIn = useMemo(() => parseAmount(amount, sell.decimals), [amount, sell.decimals]);
  const bps = slippageBps(slippage);
  const onRobinhood = chainId === robinhood.id;
  const sellAddress = sell.address === "native" ? undefined : sell.address;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: sellAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && sellAddress ? [address, SWAP_ROUTER_02] : undefined,
    query: { enabled: Boolean(address && sellAddress && onRobinhood) },
  });

  const quoteKey = `${sell.symbol}:${buy.symbol}:${amount}:${bps ?? "x"}`;
  const inputError =
    amount.trim() && !amountIn
      ? "That amount does not fit this token."
      : amountIn && bps === null
        ? "Set slippage between 0.01% and 50%."
        : null;

  useEffect(() => {
    if (!amountIn || bps === null) return;
    const key = `${sell.symbol}:${buy.symbol}:${amount}:${bps}`;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPendingKey(key);
      const search = new URLSearchParams({
        tokenIn: sell.symbol,
        tokenOut: buy.symbol,
        amount,
        slippageBps: String(bps),
      });
      fetch(`/api/quote?${search}`, { signal: controller.signal })
        .then(async (response) => {
          const body = (await response.json()) as QuoteBody & { error?: string };
          if (!response.ok) {
            setQuote(null);
            setFailure({ key, message: body.error ?? "Quote failed." });
            return;
          }
          setFailure(null);
          setQuote({ ...body, amount, sell: sell.symbol, buy: buy.symbol, slippage });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          setFailure({ key, message: "Quote failed." });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setPendingKey((current) => (current === key ? null : current));
          }
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [amount, amountIn, bps, buy.symbol, sell.symbol, slippage]);

  const quoting = pendingKey === quoteKey;
  const quoteError = inputError ?? (failure?.key === quoteKey ? failure.message : null);

  const needsApproval =
    Boolean(sellAddress) && amountIn !== null && (allowance === undefined || allowance < amountIn);
  const quoteFresh =
    quote !== null &&
    quote.amount === amount &&
    quote.sell === sell.symbol &&
    quote.buy === buy.symbol &&
    quote.slippage === slippage;
  const pairHeld =
    quote !== null && quote.sell === sell.symbol && quote.buy === buy.symbol && quote.amount === amount;

  async function approve() {
    if (!sellAddress || !amountIn) return;
    setActionError(null);
    try {
      const approved = await writeContractAsync({
        address: sellAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [SWAP_ROUTER_02, amountIn],
        chainId: robinhood.id,
      });
      setHash(approved);
      await refetchAllowance();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Approval failed.");
    }
  }

  async function swap() {
    if (!address || !amountIn || !quoteFresh || !quote) return;
    setActionError(null);
    try {
      const call = buildSwapCall({
        tokenIn: sell.address,
        tokenOut: buy.address,
        fee: quote.fee,
        amountIn,
        amountOutMinimum: BigInt(quote.amountOutMinimum),
        recipient: address,
      });
      const sent = await sendTransactionAsync({
        to: call.to,
        data: call.data,
        value: call.value,
        chainId: robinhood.id,
      });
      setHash(sent);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Swap failed.");
    }
  }

  function flip() {
    setSell(buy);
    setBuy(sell);
    setAmount("");
    setFlipped((current) => !current);
  }

  function takePair(sellSymbol: string, buySymbol: string) {
    const nextSell = findToken(sellSymbol);
    const nextBuy = findToken(buySymbol);
    if (!nextSell || !nextBuy) return;
    setSell(nextSell);
    setBuy(nextBuy);
    if (!parseAmount(amount, nextSell.decimals)) setAmount("");
  }

  let actionLabel = `Swap ${sell.symbol} for ${buy.symbol}`;
  let action: () => void = () => {
    void swap();
  };
  let disabled = false;
  if (!isConnected) {
    actionLabel = "Connect a wallet";
    disabled = true;
  } else if (!onRobinhood) {
    actionLabel = switching ? "Switching" : "Switch to Robinhood";
    action = () => switchChain({ chainId: robinhood.id });
  } else if (!amountIn) {
    actionLabel = "Enter an amount";
    disabled = true;
  } else if (quoting || !quoteFresh) {
    actionLabel = "Reading the pool";
    disabled = true;
  } else if (quoteError) {
    actionLabel = "No route";
    disabled = true;
  } else if (needsApproval) {
    actionLabel = approving ? `Approving ${sell.symbol}` : `Approve ${sell.symbol}`;
    action = () => {
      void approve();
    };
    disabled = approving;
  } else if (sending) {
    actionLabel = "Confirm in wallet";
    disabled = true;
  }

  const impact = quoteFresh && quote ? quote.priceImpactBps : null;
  const rate = quoteFresh && quote && amountIn ? unitRate(amountIn, quote.amountOut, sell, buy) : null;
  const shownOut = pairHeld && quote ? quote.amountOutDisplay : "";

  return (
    <section className="trade-sheen relative overflow-hidden rounded-[28px] border border-line bg-panel/95 p-4 shadow-[0_30px_80px_-36px_rgba(223,242,90,0.45)] sm:p-6">
      <div className={`quote-scan absolute inset-x-0 top-0 h-0.5 bg-lime ${quoting ? "opacity-100" : "opacity-0"}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-lime">THE BOOK</p>
          <h1 className="mt-1 font-mono text-3xl tracking-tight text-paper">
            {sell.symbol}
            <span className="mx-2 text-mist">/</span>
            {buy.symbol}
          </h1>
        </div>
        <p className="rounded-full border border-line px-3 py-1 font-mono text-[11px] tracking-wide text-mist">
          Robinhood v3
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PAIRS.map(([from, to]) => {
          const active = sell.symbol === from && buy.symbol === to;
          return (
            <Chip key={`${from}-${to}`} active={active} onClick={() => takePair(from, to)}>
              {from}→{to}
            </Chip>
          );
        })}
      </div>

      <p className="mt-4 min-h-7 font-mono text-sm text-paper" aria-live="polite">
        {rate ? (
          <>
            1 {sell.symbol} <span className="text-mist">=</span>{" "}
            <span className="text-lime">{rate}</span> {buy.symbol}
          </>
        ) : quoting ? (
          <span className="text-mist">Reading the pool…</span>
        ) : (
          <span className="text-mist">Pick a size. The rate comes off the pool.</span>
        )}
      </p>

      <TokenField
        label="You pay"
        token={sell}
        onToken={(next) => {
          if (next.symbol === buy.symbol) setBuy(sell);
          setSell(next);
        }}
        amount={amount}
        onAmount={setAmount}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {sizesFor(sell.group, sell.symbol).map((size) => (
          <Chip key={size} active={amount === size} onClick={() => setAmount(size)}>
            {chipLabel(size)}
          </Chip>
        ))}
      </div>

      <div className="relative z-10 -my-1 flex justify-center">
        <button
          type="button"
          onClick={flip}
          className={`grid h-10 w-10 place-items-center rounded-full border border-lime/40 bg-ink text-lime shadow-[0_0_24px_-8px_rgba(223,242,90,0.8)] transition-transform duration-300 ${
            flipped ? "rotate-180" : ""
          }`}
          aria-label="Flip pair"
        >
          ↕
        </button>
      </div>

      <TokenField
        label="You receive"
        token={buy}
        onToken={(next) => {
          if (next.symbol === sell.symbol) setSell(buy);
          setBuy(next);
        }}
        amount={shownOut}
        readOnly
        live={Boolean(rate)}
      />

      <AverageRail
        windowSeconds={pairHeld ? (quote?.twapWindow ?? null) : null}
        average={pairHeld ? (quote?.twapDisplay ?? null) : null}
        gapBps={pairHeld ? (quote?.twapGapBps ?? null) : null}
        symbol={buy.symbol}
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Minimum" value={quoteFresh && quote ? quote.minimumDisplay : "—"} />
        <Stat label="Pool fee" value={quoteFresh && quote ? feeLabel(quote.fee) : "—"} />
        <Stat label="Impact" value={impact === null ? "—" : `${(impact / 100).toFixed(2)}%`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] tracking-[0.18em] text-mist">SLIPPAGE</span>
        {SLIPPAGE_PRESETS.map((preset) => (
          <Chip key={preset} active={slippage === preset} onClick={() => setSlippage(preset)}>
            {preset}%
          </Chip>
        ))}
        <input
          value={slippage}
          onChange={(event) => setSlippage(event.target.value)}
          inputMode="decimal"
          className="ml-auto w-16 rounded-full border border-line bg-ink px-3 py-1 text-right font-mono text-xs text-paper"
          aria-label="Slippage percent"
        />
      </div>

      <div className="mt-3 min-h-5 space-y-1 font-mono text-xs">
        {quoteError ? <p className="text-danger">{quoteError}</p> : null}
        {actionError ? <p className="text-danger">{actionError}</p> : null}
        {impact !== null && impact > 500 ? <p className="text-gold">Price impact is above 5%.</p> : null}
        {receipt.isSuccess && hash ? (
          <a className="text-lime underline" href={explorerTx(hash)} target="_blank" rel="noreferrer">
            Swap landed. View the transaction.
          </a>
        ) : null}
        {receipt.isLoading ? <p className="text-mist">Waiting for the block…</p> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={action}
        className={`mt-2 w-full rounded-2xl py-3.5 text-base font-semibold tracking-wide ${
          disabled
            ? "cursor-not-allowed bg-panel-2 text-mist"
            : "bg-lime text-ink shadow-[0_0_36px_-8px_rgba(223,242,90,0.95)] hover:brightness-110"
        }`}
      >
        {actionLabel}
      </button>
    </section>
  );
}

function AverageRail({
  windowSeconds,
  average,
  gapBps,
  symbol,
}: {
  windowSeconds: number | null;
  average: string | null;
  gapBps: number | null;
  symbol: string;
}) {
  const minutes = windowSeconds ? Math.round(windowSeconds / 60) : null;
  const clamped = Math.max(-50, Math.min(50, gapBps ?? 0));
  const marker = 50 - (clamped / 50) * 40;
  const gap =
    gapBps === null
      ? null
      : gapBps === 0
        ? "Instant matches the average"
        : `Instant is ${(Math.abs(gapBps) / 100).toFixed(2)}% ${gapBps > 0 ? "under" : "over"} the average`;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-ink/60 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gold">
          {minutes ? `${minutes} MIN AVERAGE` : "AVERAGE"}
        </p>
        <p className="font-mono text-sm text-paper">
          {average ? (
            <>
              {average} <span className="text-mist">{symbol}</span>
            </>
          ) : (
            <span className="text-mist">Waiting on the pool</span>
          )}
        </p>
      </div>
      <div className="relative mt-3 h-1.5 rounded-full bg-panel-2">
        <div className="absolute inset-y-0 left-1/2 w-px bg-gold" />
        {gapBps !== null ? (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_12px_rgba(223,242,90,0.9)]"
            style={{ left: `${marker}%` }}
          />
        ) : null}
      </div>
      <p className="mt-2 font-mono text-[11px] text-mist">{gap ?? "The marker lands when the quote does."}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink/50 px-3 py-2">
      <p className="font-mono text-[10px] tracking-[0.16em] text-mist">{label.toUpperCase()}</p>
      <p className="mt-1 truncate font-mono text-sm text-paper">{value}</p>
    </div>
  );
}

function Chip({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 font-mono text-xs ${
        active ? "border-lime bg-lime text-ink" : "border-line text-mist hover:border-lime/50 hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

function TokenField({
  label,
  token,
  onToken,
  amount,
  onAmount,
  readOnly = false,
  live = false,
}: {
  label: string;
  token: Token;
  onToken: (token: Token) => void;
  amount: string;
  onAmount?: (value: string) => void;
  readOnly?: boolean;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink/75 p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-mist">
        <span>{label}</span>
        <span className="truncate pl-3 font-mono">{token.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          value={amount}
          readOnly={readOnly}
          inputMode="decimal"
          placeholder="0"
          onChange={(event) => onAmount?.(event.target.value)}
          className={`w-full bg-transparent font-mono text-4xl tracking-tight outline-none placeholder:text-line ${
            live ? "text-lime" : "text-paper"
          }`}
          aria-label={label}
        />
        <select
          value={token.symbol}
          onChange={(event) => {
            const next = findToken(event.target.value);
            if (next) onToken(next);
          }}
          className="max-w-[8.5rem] rounded-full border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-paper"
          aria-label={`${label} token`}
        >
          {TOKEN_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {TOKENS.filter((option) => option.group === group).map((option) => (
                <option key={option.symbol} value={option.symbol}>
                  {option.symbol}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}
