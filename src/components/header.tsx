"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { BRAND } from "@/config/brand";
import { robinhood } from "@/config/chain";
import { ConnectButton } from "@/components/connect-button";

const LINKS = [
  { href: "/", label: "Trade" },
  { href: "/pools", label: "Pools" },
  { href: "/vibe", label: "Packs" },
  { href: "/friends", label: "Friends" },
  { href: "/collections", label: "Collections" },
  { href: "/portfolio", label: "Bag" },
  { href: "/trends", label: "Tape" },
  { href: "/rfgame", label: "Hood" },
] as const;

export function Header() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onRobinhood = !isConnected || chainId === robinhood.id;

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-paper">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-lime font-mono text-sm font-semibold text-ink">
            dx
          </span>
          <span className="text-lg tracking-tight">{BRAND}</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 ${
                  active ? "bg-lime/15 text-lime" : "text-mist hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`hidden items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] tracking-wide sm:flex ${
              onRobinhood ? "text-lime" : "text-gold"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${onRobinhood ? "bg-lime" : "bg-gold"}`} />
            {onRobinhood ? "Robinhood 4663" : "Wrong network"}
          </span>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
