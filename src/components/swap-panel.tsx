"use client";

import { useEffect, useMemo, useState } from "react";
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
import { findToken, TOKEN_GROUPS, TOKENS, type Token } from "@/config/tokens";
import { explorerTx, feeLabel, parseAmount, slippageBps } from "@/lib/format";
import { buildSwapCall } from "@/lib/swap-call";

type QuoteBody = {
  fee: number;
  amountOut: string;
  amountOutMinimum: string;
  amountOutDisplay: string;
  minimumDisplay: string;
  priceImpactBps: number;
  amount: string;
  sell: string;
  buy: string;
  slippage: string;
};

function otherToken(symbol: string): Token {
  return TOKENS.find((token) => token.symbol !== symbol) ?? TOKENS[1];
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
  }

  let actionLabel = "Swap";
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
    actionLabel = "Quoting";
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

  return (
    <section className="rounded-3xl border border-line bg-panel/90 p-4 shadow-2xl shadow-black/20 sm:p-5">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-lime">UNISWAP V3</p>
          <h1 className="text-2xl tracking-tight">Trade</h1>
        </div>
        <label className="text-right text-xs text-mist">
          Slippage
          <input
            value={slippage}
            onChange={(event) => setSlippage(event.target.value)}
            inputMode="decimal"
            className="mt-1 block w-20 rounded-xl border border-line bg-ink px-2 py-1 text-right font-mono text-sm text-paper"
            aria-label="Slippage percent"
          />
        </label>
      </div>

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
      <div className="relative z-10 -my-3 flex justify-center">
        <button
          type="button"
          onClick={flip}
          className="rounded-full border border-line bg-ink px-3 py-1 text-sm text-lime"
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
        amount={quoteFresh && quote ? quote.amountOutDisplay : ""}
        readOnly
      />

      <div className="mt-4 space-y-1 font-mono text-xs text-mist">
        {quoteFresh && quote ? (
          <>
            <p>
              Minimum received {quote.minimumDisplay} {buy.symbol}
            </p>
            <p>
              Fee tier {feeLabel(quote.fee)}
              {impact !== null ? ` · impact ${(impact / 100).toFixed(2)}%` : ""}
            </p>
          </>
        ) : null}
        {quoting ? <p>Reading the book…</p> : null}
        {quoteError ? <p className="text-danger">{quoteError}</p> : null}
        {actionError ? <p className="text-danger">{actionError}</p> : null}
        {impact !== null && impact > 500 ? (
          <p className="text-gold">Price impact is above 5%.</p>
        ) : null}
        {receipt.isSuccess && hash ? (
          <a className="text-lime underline" href={explorerTx(hash)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        ) : null}
        {receipt.isLoading ? <p>Waiting for the block…</p> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={action}
        className="mt-4 w-full rounded-2xl bg-lime py-3 text-base font-semibold text-ink disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-mist"
      >
        {actionLabel}
      </button>
      <p className="mt-3 text-center text-xs text-mist">
        Settles in your wallet on Robinhood Chain. Stock and fund tokens are the issuer contracts, quoted on Uniswap v3.
      </p>
    </section>
  );
}

function TokenField({
  label,
  token,
  onToken,
  amount,
  onAmount,
  readOnly = false,
}: {
  label: string;
  token: Token;
  onToken: (token: Token) => void;
  amount: string;
  onAmount?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink/70 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-mist">
        <span>{label}</span>
        <span className="font-mono">{token.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          value={amount}
          readOnly={readOnly}
          inputMode="decimal"
          placeholder="0"
          onChange={(event) => onAmount?.(event.target.value)}
          className="w-full bg-transparent font-mono text-3xl text-paper outline-none placeholder:text-line"
          aria-label={label}
        />
        <select
          value={token.symbol}
          onChange={(event) => {
            const next = findToken(event.target.value);
            if (next) onToken(next);
          }}
          className="max-w-[9.5rem] rounded-xl border border-line bg-panel-2 px-3 py-2 font-mono text-sm"
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
