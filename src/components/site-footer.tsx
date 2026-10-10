import type { ReactNode } from "react";
import Link from "next/link";
import { BRAND } from "@/config/brand";

export const SOCIALS = [
  { label: "X", href: "https://x.com/bihary41418" },
  { label: "Farcaster", href: "https://farcaster.xyz/~/channel/auraos" },
  { label: "Discord", href: "https://discord.gg/geUpHt3eSb" },
  { label: "Telegram", href: "https://t.me/+4zFH7-2tyW0yOTBk" },
  { label: "GitHub", href: "https://github.com/Laszlo23/dexxxx" },
] as const;

const LEGAL = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/risk", label: "Risk" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line/80">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_auto_auto] sm:items-end lg:px-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-lime">DEX XXX</p>
          <p className="mt-3 flex items-center gap-2 text-xl tracking-tight text-paper">
            Made with love
            <Heart />
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-mist">
            For the book, the friends, the packs, and the bag. Chain 4663, held gently.
          </p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Legal">
          {LEGAL.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-mist hover:text-paper">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2" aria-label="Social">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-mist hover:border-lime/60 hover:text-lime"
            >
              <SocialIcon name={social.label} />
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-line/60">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 font-mono text-[11px] tracking-wide text-mist lg:px-6">
          {BRAND} · Robinhood Chain 4663
        </p>
      </div>
    </footer>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-lime" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20.2s-6.6-4.1-6.6-8.7c0-2.4 1.7-4.1 3.8-4.1 1.2 0 2.2.6 2.8 1.5.6-.9 1.6-1.5 2.8-1.5 2.1 0 3.8 1.7 3.8 4.1 0 4.6-6.6 8.7-6.6 8.7z"
      />
    </svg>
  );
}

export function SocialIcon({ name }: { name: (typeof SOCIALS)[number]["label"] }) {
  const common = { viewBox: "0 0 24 24", className: "h-4 w-4", "aria-hidden": true as const, fill: "currentColor" };
  switch (name) {
    case "X":
      return (
        <svg {...common}>
          <path d="M14.7 10.3 21.4 3h-1.6l-5.8 6.4L9.2 3H3.2l7 9.7L3.2 21h1.6l6.2-6.8L14.8 21h6zM11.8 13.1l-.7-1-5.7-7.7h2.4l4.6 6.2.7 1 6 8.1h-2.4z" />
        </svg>
      );
    case "Farcaster":
      return (
        <svg {...common}>
          <path d="M5.2 5.2h13.6v1.8h-1.2v8.4c1 .3 1.7 1 1.7 1.8h-1.9c0-.6-.6-1-1.3-1h-.5v1.6H8.4v-1.6h-.5c-.7 0-1.3.4-1.3 1H4.7c0-.8.7-1.5 1.7-1.8V7h-1.2V5.2zm3.4 2h1.7v5.4H8.6V7.2zm5.1 0h1.7v5.4h-1.7V7.2z" />
        </svg>
      );
    case "Discord":
      return (
        <svg {...common}>
          <path d="M18.6 6.1A14 14 0 0 0 15.2 5l-.3.6a12.6 12.6 0 0 1 3.2 1 13 13 0 0 0-10.2 0A12 12 0 0 1 9.1 5.6L8.8 5a14 14 0 0 0-3.4 1.1C3.2 8.6 2.6 11 2.8 13.4a14 14 0 0 0 4.3 1.9l.4-.6a9 9 0 0 1-1.3-.6l.3-.3a10 10 0 0 0 8.6 0l.3.3a9 9 0 0 1-1.3.6l.4.6a14 14 0 0 0 4.3-1.9c.2-2.6-.4-5-1.8-7.3zM9.3 12.4c-.7 0-1.2-.6-1.2-1.4s.5-1.4 1.2-1.4 1.2.6 1.2 1.4-.5 1.4-1.2 1.4zm5.4 0c-.7 0-1.2-.6-1.2-1.4s.5-1.4 1.2-1.4 1.2.6 1.2 1.4-.5 1.4-1.2 1.4z" />
        </svg>
      );
    case "Telegram":
      return (
        <svg {...common}>
          <path d="M19.8 5.3 3.9 11.2c-1.1.4-1.1 1 .2 1.3l4.1 1.3 1.6 4.8c.2.6.4.8.9.8.4 0 .6-.2.8-.5l2.2-2.1 4.3 3.2c.8.4 1.4.2 1.6-.7l2.6-12.2c.3-1.1-.4-1.6-1.4-1.2zM9.2 13.4l7.6-4.7c.4-.2.7 0 .4.3l-6.5 5.9-.3 3.2z" />
        </svg>
      );
    case "GitHub":
      return (
        <svg {...common}>
          <path d="M12 3.2a8.8 8.8 0 0 0-2.8 17.1c.4.1.6-.2.6-.4v-1.5c-2.5.5-3-1.1-3-1.1-.4-.9-.9-1.2-.9-1.2-.8-.5.1-.5.1-.5.8.1 1.3.9 1.3.9.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-2-.2-4-1-4-4.4 0-1 .3-1.8.9-2.4-.1-.2-.4-1.2.1-2.4 0 0 .8-.3 2.5.9a8.7 8.7 0 0 1 4.6 0c1.7-1.2 2.5-.9 2.5-.9.5 1.2.2 2.2.1 2.4.6.6.9 1.4.9 2.4 0 3.4-2 4.2-4 4.4.3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4A8.8 8.8 0 0 0 12 3.2z" />
        </svg>
      );
    default: {
      const unknown: never = name;
      return unknown;
    }
  }
}

export function LegalFrame({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="trade-sheen mx-4 my-8 w-auto max-w-2xl rounded-[28px] border border-line bg-panel px-6 py-10 sm:mx-auto lg:px-8">
      <p className="font-mono text-[11px] tracking-[0.22em] text-gold">{kicker}</p>
      <h1 className="mt-2 text-4xl tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-mist">{children}</div>
    </article>
  );
}
