"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  { href: "/bound", label: "Bound" },
  { href: "/trends", label: "Tape" },
  { href: "/rfgame", label: "Hood" },
  { href: "/mark", label: "Mark" },
] as const;

function linkActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onRobinhood = !isConnected || chainId === robinhood.id;

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-paper">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-lime font-mono text-sm font-semibold text-ink">
            dx
          </span>
          <span className="text-lg tracking-tight">{BRAND}</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Desk">
          {LINKS.map((link) => {
            const active = linkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2 py-1.5 ${
                  active ? "bg-lime/15 text-lime" : "text-mist hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className={`hidden items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] tracking-wide lg:flex ${
              onRobinhood ? "text-lime" : "text-gold"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${onRobinhood ? "bg-lime" : "bg-gold"}`} />
            {onRobinhood ? "Robinhood 4663" : "Wrong network"}
          </span>
          <ConnectButton />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper lg:hidden"
            aria-expanded={menu}
            aria-controls="desk-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((open) => !open)}
          >
            <MenuMark open={menu} />
          </button>
        </div>
      </div>
      {menu ? (
        <nav id="desk-menu" className="border-t border-line/80 px-4 py-3 lg:hidden" aria-label="Desk">
          <p className={`mb-3 flex items-center gap-2 font-mono text-[11px] tracking-wide ${onRobinhood ? "text-lime" : "text-gold"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${onRobinhood ? "bg-lime" : "bg-gold"}`} />
            {onRobinhood ? "Robinhood 4663" : "Wrong network"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LINKS.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    active ? "border-lime/40 bg-lime/15 text-lime" : "border-line text-paper"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function MenuMark({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
