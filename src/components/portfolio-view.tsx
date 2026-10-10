"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { explorerAddress, shortAddress } from "@/lib/format";
import type { BagNft, Holding, Portfolio } from "@/lib/portfolio";
import { NftImage } from "@/components/nft-image";
import { Chapter, StoryOpen } from "@/components/story-frame";

export function PortfolioView() {
  const params = useSearchParams();
  const { address } = useAccount();
  const [typed, setTyped] = useState<string | null>(null);
  const owner = (typed ?? params.get("address") ?? address ?? "").trim();
  const [bag, setBag] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isAddress(owner)) return;
    const controller = new AbortController();
    setPending(true);
    fetch(`/api/portfolio?owner=${owner}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as Portfolio & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "The bag did not load.");
        setError(null);
        setBag(body);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setBag(null);
        setError(reason instanceof Error ? reason.message : "The bag did not load.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [owner]);

  const ready = Boolean(bag && isAddress(owner) && bag.owner.toLowerCase() === owner.toLowerCase());
  const wallets = bag?.nfts.filter((nft) => nft.wallet) ?? [];
  const loose = bag?.nfts.filter((nft) => !nft.wallet) ?? [];
  const story = ready && bag ? openingLine(bag) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <StoryOpen
        kicker="THE BAG"
        title="A bag, opened."
        lede={
          story ??
          "Every address on Robinhood has a pocket and, sometimes, pictures that keep a wallet of their own. This page reads one of them."
        }
      >
        {pending ? <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-lime">Reading the pocket, then the pictures.</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {owner && !isAddress(owner) ? <p className="mt-3 text-sm text-danger">That string is not an address, so this page stays shut.</p> : null}
        <label className="mt-6 block max-w-md">
          <span className="font-mono text-[11px] tracking-[0.18em] text-lime">WHOSE BAG</span>
          <input
            value={typed ?? params.get("address") ?? address ?? ""}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            placeholder="0x…"
            className="mt-2 block w-full rounded-2xl border border-line bg-ink px-4 py-3 font-mono text-sm text-paper outline-none"
            aria-label="Wallet address"
          />
        </label>
        {isAddress(owner) ? (
          <a className="mt-3 inline-block font-mono text-xs text-gold" href={explorerAddress(owner)} target="_blank" rel="noreferrer">
            {shortAddress(owner)} on the explorer
          </a>
        ) : null}
        {ready && bag ? <Contents /> : null}
      </StoryOpen>

      {!owner ? (
        <p className="mt-8 max-w-xl text-sm leading-6 text-mist">Connect a wallet, or paste an address. The next page is the bag.</p>
      ) : null}

      {ready && bag ? (
        <div className="mt-4">
          <Chapter id="pocket" numeral="I" kicker="THE POCKET" title="What the address is holding." lede={pocketLede(bag.holdings)}>
            {bag.holdings.length > 0 ? <Ledger holdings={bag.holdings} /> : null}
          </Chapter>
          <Chapter
            id="inside"
            numeral="II"
            kicker="INSIDE THE PICTURES"
            title="Some pictures keep a wallet."
            lede={insideLede(wallets.length, bag.nfts.length)}
          >
            <div className="grid gap-4">
              {wallets.map((nft) => (
                <WalletScene key={`${nft.contract}-${nft.id}`} nft={nft} />
              ))}
            </div>
          </Chapter>
          <Chapter id="cast" numeral="III" kicker="THE CAST" title="The pictures that stay pictures." lede={castLede(loose.length, bag.nfts.length)}>
            {loose.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {loose.map((nft) => (
                  <a
                    key={`${nft.contract}-${nft.id}`}
                    href={nft.link}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-2xl border border-line bg-panel"
                  >
                    <div className="aspect-square bg-panel-2">
                      <NftImage src={nft.image} alt={nft.name} />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm">{nft.name}</p>
                      <p className="font-mono text-[11px] text-mist">{nft.collection}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}
          </Chapter>
        </div>
      ) : null}
    </div>
  );
}

function Contents() {
  const links = [
    { href: "#pocket", label: "I · The pocket" },
    { href: "#inside", label: "II · Inside the pictures" },
    { href: "#cast", label: "III · The cast" },
  ] as const;
  return (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Chapters">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mist hover:text-paper">
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function Ledger({ holdings }: { holdings: Holding[] }) {
  const [lead, ...rest] = holdings;
  if (!lead) return null;
  return (
    <div>
      <p className="font-mono text-5xl tracking-tight">
        {lead.display}
        <span className="ml-3 text-lg text-lime">{lead.symbol}</span>
      </p>
      <p className="mt-1 text-sm text-mist">{lead.name} leads the pocket.</p>
      <ul className="mt-4">
        {rest.map((holding) => (
          <li key={holding.symbol} className="flex items-baseline justify-between gap-4 border-b border-line/80 py-3">
            <span>
              <span>{holding.symbol}</span>
              <span className="ml-3 text-sm text-mist">{holding.name}</span>
            </span>
            <span className="font-mono text-lime">{holding.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WalletScene({ nft }: { nft: BagNft }) {
  const wallet = nft.wallet;
  if (!wallet) return null;
  return (
    <article className="grid overflow-hidden rounded-3xl border border-lime/40 bg-panel sm:grid-cols-[148px_1fr]">
      <div className="aspect-square bg-panel-2 sm:aspect-auto">
        <NftImage src={nft.image} alt={nft.name} />
      </div>
      <div className="p-5">
        <p className="font-mono text-[11px] tracking-[0.16em] text-lime">{nft.collection}</p>
        <h3 className="mt-1 text-xl tracking-tight">{nft.name}</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-mist">{sceneLine(nft.name, wallet.holdings.length)}</p>
        {wallet.holdings.length > 0 ? (
          <ul className="mt-3 max-w-md">
            {wallet.holdings.map((holding) => (
              <li key={holding.symbol} className="flex items-baseline justify-between gap-4 border-b border-line/70 py-1.5 font-mono text-sm">
                <span className="text-mist">{holding.symbol}</span>
                <span>{holding.display}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <a className="mt-3 inline-block font-mono text-xs text-gold" href={explorerAddress(wallet.address)} target="_blank" rel="noreferrer">
          {shortAddress(wallet.address)} on the explorer
        </a>
        <a href={nft.link} target="_blank" rel="noreferrer" className="ml-4 inline-block font-mono text-xs text-mist">
          OpenSea
        </a>
      </div>
    </article>
  );
}

function openingLine(bag: Portfolio): string {
  const pocket =
    bag.holdings.length === 0
      ? "The pocket is empty of the tokens this desk tracks."
      : `The pocket holds ${countWord(bag.holdings.length, "balance", "balances")}.`;
  const pictures =
    bag.nfts.length === 0
      ? "OpenSea sent back an empty Robinhood bag."
      : `${bag.nfts.length === 1 ? "One picture" : `${bag.nfts.length.toLocaleString("en-US")} pictures`} came along.`;
  if (bag.nfts.length === 0) return `${pocket} ${pictures}`;
  const inside =
    bag.wallets === 0
      ? " They stay pictures."
      : bag.wallets === 1
        ? " One of them keeps a wallet inside."
        : ` ${bag.wallets.toLocaleString("en-US")} of them keep a wallet inside.`;
  return `${pocket} ${pictures}${inside}`;
}

function pocketLede(holdings: Holding[]): string {
  if (holdings.length === 0) return "ETH, USDG, the stock tokens, and the desk coins would be written here.";
  if (holdings.length === 1) return `${holdings[0]?.symbol ?? "This balance"} is the whole pocket.`;
  return `First the ${holdings[0]?.symbol ?? "lead balance"}, then the rest of what this address is carrying.`;
}

function insideLede(wallets: number, pictures: number): string {
  if (pictures === 0) return "A wallet inside a picture shows up when the bag has one to read.";
  if (wallets === 0) return "The pictures in this bag stay pictures. A token-bound account shows up when the desk can read one.";
  if (wallets === 1) return "One picture on Robinhood is also an account. This is what it is holding.";
  return `${wallets.toLocaleString("en-US")} pictures on Robinhood are also accounts. This is what each one is holding.`;
}

function castLede(loose: number, pictures: number): string {
  if (pictures === 0) return "The OpenSea bag for this address is empty on Robinhood.";
  if (loose === 0) return "Every picture in this bag already has a wallet, and that story is above.";
  if (loose === pictures) return "The whole cast is here, picture by picture.";
  if (loose === 1) return "One picture stays on the page as a picture.";
  return `${loose.toLocaleString("en-US")} pictures stay on the page as pictures.`;
}

function sceneLine(name: string, balances: number): string {
  if (balances === 0) return `${name} keeps an account. The tracked balances in it are zero.`;
  if (balances === 1) return `${name} keeps an account, and one balance is sitting in it.`;
  return `${name} keeps an account, and ${balances.toLocaleString("en-US")} balances are sitting in it.`;
}

function countWord(count: number, singular: string, plural: string): string {
  return count === 1 ? `one ${singular}` : `${count.toLocaleString("en-US")} ${plural}`;
}

