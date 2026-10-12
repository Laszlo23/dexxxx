"use client";

import Link from "next/link";
import { useState } from "react";
import { NftImage } from "@/components/nft-image";
import { ringPass } from "@/lib/chime";
import { copyText } from "@/lib/clipboard";

const SITE = "https://dex.aibusiness.fun";
const HOLES = ["a", "b", "c", "d", "e"] as const;

export function PassOn({
  title,
  line,
  path,
  image,
  kicker = "PASS IT ON",
  cardSrc,
  onPassed,
}: {
  title: string;
  line: string;
  path: string;
  image?: string;
  kicker?: string;
  cardSrc?: string;
  onPassed?: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [failed, setFailed] = useState(false);
  const localPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${SITE}${localPath}`;
  const x = `https://x.com/intent/post?text=${encodeURIComponent(line)}&url=${encodeURIComponent(url)}`;
  const cast = `https://farcaster.xyz/~/compose?text=${encodeURIComponent(line)}&embeds[]=${encodeURIComponent(url)}`;

  function ring() {
    setRinging(true);
    window.setTimeout(() => setRinging(false), 700);
    ringPass();
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-lime/50 bg-ink shadow-[0_0_40px_rgba(223,242,90,0.08)]">
      <span
        aria-hidden
        className={`absolute right-0 top-0 h-6 w-6 bg-lime [clip-path:polygon(0_0,100%_100%,100%_0)] ${ringing ? "ticket-bell" : ""}`}
      />
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-44 border-b border-dashed border-lime/50 sm:h-auto sm:w-36 sm:self-stretch sm:border-b-0 sm:border-r">
          <div className="absolute inset-0">
            {image ? (
              <NftImage src={image} alt="" />
            ) : (
              <div className="grid h-full place-items-center bg-lime font-mono text-3xl text-ink">dx</div>
            )}
          </div>
          <span aria-hidden className="absolute -right-1.5 top-4 hidden flex-col gap-3 sm:flex">
            {HOLES.map((hole) => (
              <span key={hole} className="h-3 w-3 rounded-full border border-lime bg-[#090b08]" />
            ))}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 border-b border-lime/25 px-4 py-3">
            <p className="font-mono text-[11px] tracking-[0.22em] text-lime">{kicker}</p>
            <p className="font-mono text-[11px] tracking-[0.16em] text-gold">CHAIN 4663</p>
          </div>
          <div className="px-4 py-5">
            <h2 className="text-2xl tracking-tight">{title}</h2>
            <p className="mt-3 text-base leading-7 text-paper">{line}</p>
            <Link href={localPath} className="mt-3 block break-all font-mono text-xs text-gold hover:text-lime sm:truncate">
              {url.replace("https://", "")}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-lime/25 px-4 py-3">
            <a
              href={x}
              target="_blank"
              rel="noreferrer"
              onClick={() => onPassed?.()}
              className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink"
            >
              Share on X
            </a>
            <a
              href={cast}
              target="_blank"
              rel="noreferrer"
              onClick={() => onPassed?.()}
              className="rounded-full border border-lime/50 px-4 py-2 text-sm text-lime"
            >
              Cast it
            </a>
            <button
              type="button"
              onClick={() => {
                void copyText(url).then(
                  (copied) => {
                    setNote(copied ? "Link copied." : "Copy was blocked in this browser.");
                    if (copied) {
                      ring();
                      onPassed?.();
                    }
                  },
                  () => setNote("Copy was blocked in this browser."),
                );
              }}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper"
            >
              Copy the link
            </button>
        {cardSrc ? (
          <button
            type="button"
            onClick={() => {
              setOpen((current) => !current);
              if (!open) ring();
            }}
            className="rounded-full border border-gold/60 px-4 py-2 text-sm text-gold"
          >
            {open ? "Hide the card" : "See the card"}
          </button>
        ) : null}
      </div>
      {open && cardSrc ? (
        <div className="border-t border-lime/25 px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.16em] text-gold">THE CARD THEY SEE</p>
          {failed ? <p className="mt-2 text-sm text-mist">The card did not draw.</p> : null}
          {drawn || failed ? null : <p className="mt-2 text-sm text-mist">Drawing the card…</p>}
          {failed ? null : (
            // The card is a generated desk image, not a content-sized photo.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardSrc}
              alt={line}
              width={1200}
              height={630}
              className={`mt-2 w-full rounded-2xl border border-line ${drawn ? "" : "hidden"}`}
              onLoad={() => setDrawn(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : null}
      {note ? <p className="px-4 pb-3 font-mono text-[11px] text-lime">{note}</p> : null}
        </div>
      </div>
    </section>
  );
}
