"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toDataURL } from "qrcode";
import { useAccount, useConnect, useDisconnect, type Connector } from "wagmi";
import { robinhood } from "@/config/chain";
import { copyText } from "@/lib/clipboard";
import { shortAddress } from "@/lib/format";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type DoorKind = "walletConnect" | "browser" | "named";

type PairingProvider = {
  on(event: "display_uri", listener: (uri: string) => void): void;
  removeListener(event: "display_uri", listener: (uri: string) => void): void;
  signer: {
    client?: {
      disconnect(params: { topic: string }): Promise<void>;
    };
  };
};

function pairingTopic(uri: string): string | null {
  const match = /^wc:([^@]+)@2/.exec(uri);
  return match?.[1] ?? null;
}

function doorKind(connector: Connector): DoorKind {
  if (connector.id === "walletConnect" || connector.type === "walletConnect") return "walletConnect";
  if (connector.id === "injected") return "browser";
  return "named";
}

function doorLabel(kind: DoorKind, name: string): string {
  switch (kind) {
    case "walletConnect":
      return "WalletConnect";
    case "browser":
      return "Browser wallet";
    case "named":
      return name;
    default: {
      const unknown: never = kind;
      return unknown;
    }
  }
}

function doorHint(kind: DoorKind): string {
  switch (kind) {
    case "walletConnect":
      return "Scan with a phone wallet";
    case "browser":
      return "Extension in this window";
    case "named":
      return "Detected in this browser";
    default: {
      const unknown: never = kind;
      return unknown;
    }
  }
}

function doorRank(kind: DoorKind, phone: boolean): number {
  switch (kind) {
    case "walletConnect":
      return phone ? 2 : 0;
    case "named":
      return phone ? 0 : 1;
    case "browser":
      return phone ? 1 : 2;
    default: {
      const unknown: never = kind;
      return unknown;
    }
  }
}

type WalletApp = {
  name: string;
  hint: string;
  href: (page: string) => string;
};

const WALLET_APPS: readonly WalletApp[] = [
  {
    name: "MetaMask",
    hint: "Opens this desk in the app",
    href: (page) => {
      const url = new URL(page);
      return `https://metamask.app.link/dapp/${url.host}${url.pathname}${url.search}`;
    },
  },
  {
    name: "Coinbase Wallet",
    hint: "Opens this desk in the app",
    href: (page) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(page)}`,
  },
  {
    name: "Trust Wallet",
    hint: "Opens this desk in the app",
    href: (page) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(page)}`,
  },
];

function WalletApps({ onPick, always = false }: { onPick: () => void; always?: boolean }) {
  const page = typeof window === "undefined" ? "https://dex.aibusiness.fun/" : window.location.href;
  return (
    <div className={always ? "mt-3" : "border-t border-line px-1 pt-2 lg:hidden"}>
      <p className="px-2 pb-1 font-mono text-[11px] tracking-[0.16em] text-gold">OPEN IN THE APP</p>
      {WALLET_APPS.map((app) => (
        <a
          key={app.name}
          href={app.href(page)}
          onClick={onPick}
          className="block rounded-xl px-3 py-2 hover:bg-panel-2"
        >
          <span className="block text-sm text-paper">{app.name}</span>
          <span className="block text-xs text-mist">{app.hint}</span>
        </a>
      ))}
    </div>
  );
}

function connectMessage(error: Error): string {
  const text = error.message;
  if (/provider not found|no provider/i.test(text)) {
    return "No browser wallet in this window. Use WalletConnect.";
  }
  if (/rejected|denied|closed|reset/i.test(text)) return "Connection cancelled.";
  if (/publish custom payload|did not return a link/i.test(text)) {
    return "WalletConnect did not open a link from this site. Allow dex.aibusiness.fun on the Reown project, then try again.";
  }
  return text;
}

export function ConnectButton() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const stopPairing = useRef<(() => void) | null>(null);
  const uriRef = useRef<string | null>(null);
  const providerRef = useRef<PairingProvider | null>(null);
  const closedByUser = useRef(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    void toDataURL(uri, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
      color: { dark: "#090b08", light: "#f4f6ec" },
    }).then(
      (url) => {
        if (!cancelled) setQr(url);
      },
      () => {
        if (!cancelled) setPairError("Could not draw the QR code. Copy the link instead.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  useEffect(() => {
    if (!isConnected) return;
    stopPairing.current?.();
    stopPairing.current = null;
    setLinking(false);
    setPairing(false);
    setUri(null);
    uriRef.current = null;
    setQr(null);
  }, [isConnected]);

  useEffect(() => {
    if (!pairing || uri || pairError) return;
    const timer = window.setTimeout(() => {
      setPairError("WalletConnect did not return a link. Close this and try again.");
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [pairing, uri, pairError]);

  function endPairing() {
    closedByUser.current = true;
    const topic = uriRef.current ? pairingTopic(uriRef.current) : null;
    const provider = providerRef.current;
    stopPairing.current?.();
    stopPairing.current = null;
    setLinking(false);
    setPairing(false);
    setUri(null);
    uriRef.current = null;
    setQr(null);
    setCopied(false);
    if (!topic || !provider?.signer.client) return;
    void provider.signer.client.disconnect({ topic }).catch(() => undefined);
  }

  async function startWalletConnect(connector: Connector) {
    closedByUser.current = false;
    setOpen(false);
    setPairError(null);
    setCopied(false);
    setUri(null);
    uriRef.current = null;
    setQr(null);
    setPairing(true);
    setLinking(true);
    try {
      const provider = (await connector.getProvider()) as PairingProvider;
      providerRef.current = provider;
      const onUri = (next: string) => {
        uriRef.current = next;
        setPairError(null);
        setUri(next);
      };
      provider.on("display_uri", onUri);
      stopPairing.current = () => {
        provider.removeListener("display_uri", onUri);
      };
      connect(
        { connector, chainId: robinhood.id },
        {
          onError(connectError) {
            stopPairing.current?.();
            stopPairing.current = null;
            setLinking(false);
            if (!closedByUser.current) setPairError(connectMessage(connectError));
          },
        },
      );
    } catch (startError) {
      setLinking(false);
      setPairError(startError instanceof Error ? startError.message : "WalletConnect failed to start.");
    }
  }

  async function copyLink() {
    if (!uri) return;
    const copied = await copyText(uri);
    if (copied) {
      setCopied(true);
      setPairError(null);
      return;
    }
    setPairError("Copy was blocked. Select the link below.");
  }

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

  const phone = open && window.matchMedia("(max-width: 1023px)").matches;
  const doors = [...connectors].sort(
    (left, right) => doorRank(doorKind(left), phone) - doorRank(doorKind(right), phone),
  );

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink"
      >
        {linking ? "Connecting" : "Connect"}
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[70]" role="presentation">
              <button
                type="button"
                aria-label="Close wallet menu"
                className="absolute inset-0 bg-ink/70"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Connect a wallet"
                className="trade-sheen absolute inset-x-3 bottom-3 z-[71] max-h-[75vh] overflow-auto rounded-[28px] border border-line bg-panel p-3 shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:w-80"
              >
                <p className="px-2 pb-2 font-mono text-[11px] tracking-[0.16em] text-gold">CONNECT</p>
                {doors.map((connector) => {
                  const kind = doorKind(connector);
                  return (
                    <button
                      key={connector.uid}
                      type="button"
                      className="block w-full rounded-xl px-3 py-2 text-left hover:bg-panel-2"
                      onClick={() => {
                        if (kind === "walletConnect") {
                          void startWalletConnect(connector);
                          return;
                        }
                        setOpen(false);
                        setLinking(true);
                        connect(
                          { connector, chainId: robinhood.id },
                          { onSettled() { setLinking(false); } },
                        );
                      }}
                    >
                      <span className="block text-sm">{doorLabel(kind, connector.name)}</span>
                      <span className="block text-xs text-mist">{doorHint(kind)}</span>
                    </button>
                  );
                })}
                <WalletApps onPick={() => setOpen(false)} />
                {error ? <p className="px-2 py-1 text-xs text-danger">{connectMessage(error)}</p> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
      {pairing
        ? createPortal(
            <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-label="WalletConnect">
              <div className="trade-sheen w-full max-w-sm rounded-[28px] border border-line bg-panel p-5 shadow-2xl">
                <p className="font-mono text-[11px] tracking-[0.22em] text-gold">WALLETCONNECT</p>
                <h2 className="mt-2 text-xl tracking-tight">A link, drawn for your wallet.</h2>
                <p className="mt-1 text-sm text-mist">
                  Open this desk inside the wallet app, then connect there. The code is for a second screen.
                </p>
                <WalletApps always onPick={() => undefined} />
                <div className="mt-4 grid min-h-72 place-items-center rounded-2xl bg-paper p-4">
                  {qr ? (
                    <img src={qr} alt="WalletConnect QR code" width={280} height={280} />
                  ) : (
                    <p className="px-4 text-center text-sm text-ink">
                      {pairError ?? "Asking WalletConnect for a link…"}
                    </p>
                  )}
                </div>
                {uri ? (
                  <input
                    readOnly
                    value={uri}
                    aria-label="WalletConnect link"
                    onFocus={(event) => event.currentTarget.select()}
                    className="mt-3 w-full truncate rounded-xl border border-line bg-ink px-3 py-2 font-mono text-[11px] text-mist"
                  />
                ) : null}
                {pairError && qr ? <p className="mt-3 text-xs text-danger">{pairError}</p> : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={!uri}
                    onClick={() => void copyLink()}
                    className="flex-1 rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => endPairing()}
                    className="rounded-full border border-line px-4 py-2 text-sm text-paper"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
