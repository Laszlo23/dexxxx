"use client";

import { useState } from "react";
import { parseEther, stringToHex, type Hex } from "viem";
import { useAccount, useChainId, useSendTransaction, useSwitchChain } from "wagmi";
import { robinhood } from "@/config/chain";
import { explorerTx, shortAddress } from "@/lib/format";

/** Primary wallet verified on Farcaster by 0xleonardo, FID 873944. */
const GM_WALLET = "0x502ce9FB1814cb03843967EC5E0D8F6AA3A3C2e1" as const;
const GM_VALUE = parseEther("0.0001");
const GM_DATA = stringToHex("gm");

export function GmButton() {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState<Hex | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onRobinhood = chainId === robinhood.id;
  const { switchChain, isPending: switching } = useSwitchChain();
  const { sendTransactionAsync, isPending: sending } = useSendTransaction();

  async function send() {
    if (!isConnected) return;
    setError(null);
    if (!onRobinhood) {
      switchChain({ chainId: robinhood.id });
      return;
    }
    try {
      const sent = await sendTransactionAsync({
        to: GM_WALLET,
        value: GM_VALUE,
        data: GM_DATA,
        chainId: robinhood.id,
      });
      setHash(sent);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The gm did not send.";
      setError(message.toLowerCase().includes("reject") ? "The wallet rejected the gm." : message.slice(0, 160));
    }
  }

  let label = "Send gm";
  let disabled = false;
  if (!isConnected) {
    label = "Connect a wallet";
    disabled = true;
  } else if (!onRobinhood) {
    label = switching ? "Switching" : "Switch to Robinhood";
  } else if (sending) {
    label = "Confirm in wallet";
    disabled = true;
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3">
      {open ? (
        <section className="w-64 rounded-3xl border border-line bg-panel/95 p-4 shadow-[0_20px_60px_-24px_rgba(223,242,90,0.7)]">
          <p className="font-mono text-[11px] tracking-[0.22em] text-lime">GM</p>
          <p className="mt-2 text-sm text-paper">0.0001 ETH, with gm written on the transfer.</p>
          <p className="mt-1 font-mono text-xs text-mist">to {shortAddress(GM_WALLET)}</p>
          {error ? <p className="mt-2 font-mono text-xs text-danger">{error}</p> : null}
          {hash ? (
            <a className="mt-2 block font-mono text-xs text-lime underline" href={explorerTx(hash)} target="_blank" rel="noreferrer">
              gm sent
            </a>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => void send()}
            className={`mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold ${
              disabled ? "cursor-not-allowed bg-panel-2 text-mist" : "bg-lime text-ink"
            }`}
          >
            {label}
          </button>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close gm" : "Send gm"}
        onClick={() => setOpen((current) => !current)}
        className="grid h-14 w-14 place-items-center rounded-full bg-lime font-mono text-sm font-semibold text-ink shadow-[0_0_32px_-6px_rgba(223,242,90,0.95)]"
      >
        gm
      </button>
    </div>
  );
}
