"use client";

import { useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ConnectButton() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  if (!mounted) {
    return (
      <button type="button" className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink">
        Connect
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-full border border-line bg-panel px-4 py-2 font-mono text-sm text-paper"
        title="Disconnect"
      >
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink"
      >
        {isPending ? "Connecting" : "Connect"}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-line bg-panel p-2 shadow-xl">
          {connectors.length === 0 ? (
            <p className="px-2 py-2 text-sm text-mist">No browser wallet found.</p>
          ) : (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-panel-2"
                onClick={() => connect({ connector })}
              >
                {connector.name}
              </button>
            ))
          )}
          {error ? <p className="px-2 py-1 text-xs text-danger">{error.message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
