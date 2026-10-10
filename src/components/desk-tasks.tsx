"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { SHARE_POSTS } from "@/data/share-posts";
import { copyText } from "@/lib/clipboard";

const SITE = "https://dex.aibusiness.fun";
const STORAGE_KEY = "dexxxx-desk-tasks";

type ShareTask = "x" | "cast" | "copy";

type Done = Record<ShareTask, boolean>;

const EMPTY: Done = { x: false, cast: false, copy: false };
const listeners = new Set<() => void>();
let snapshot: Done = EMPTY;

function sameDone(left: Done, right: Done) {
  return left.x === right.x && left.cast === right.cast && left.copy === right.copy;
}

function readDone(): Done {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      snapshot = EMPTY;
      return snapshot;
    }
    const parsed = JSON.parse(raw) as Partial<Done>;
    const next = { x: Boolean(parsed.x), cast: Boolean(parsed.cast), copy: Boolean(parsed.copy) };
    if (!sameDone(snapshot, next)) snapshot = next;
    return snapshot;
  } catch {
    snapshot = EMPTY;
    return snapshot;
  }
}

function writeDone(task: ShareTask) {
  const next = { ...readDone(), [task]: true };
  snapshot = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function openShare(task: ShareTask, href: string) {
  writeDone(task);
  window.open(href, "_blank", "noopener,noreferrer");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function shareLinks(id: string, tweet: string) {
  const url = `${SITE}/share/${id}`;
  return {
    x: `https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`,
    cast: `https://farcaster.xyz/~/compose?text=${encodeURIComponent(tweet)}&embeds[]=${encodeURIComponent(url)}`,
    url,
  };
}

export function DeskTasks() {
  const { isConnected } = useAccount();
  const done = useSyncExternalStore(subscribe, readDone, () => EMPTY);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const post = SHARE_POSTS[index] ?? SHARE_POSTS[0];
  const links = shareLinks(post.id, post.tweet);
  const finished = Number(isConnected) + Number(done.x) + Number(done.cast) + Number(done.copy);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SHARE_POSTS.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section className="trade-sheen mt-3 rounded-[28px] border border-line bg-panel/90 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-gold">DESK TASKS</p>
          <h2 className="mt-1 text-xl tracking-tight">Seven seconds, given with love.</h2>
        </div>
        <p className="font-mono text-xs text-mist">{finished} / 4</p>
      </div>
      <div className="mt-3 overflow-hidden rounded-3xl border border-line bg-ink/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={post.id}
          src={`/card/${post.id}`}
          alt={post.headline}
          width={1200}
          height={630}
          className="aspect-[1200/630] w-full object-cover"
        />
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm text-paper">{post.headline}</p>
            <p className="mt-1 text-xs text-mist">{post.line}</p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIndex((current) => (current + 1) % SHARE_POSTS.length)}
              className="font-mono text-[11px] tracking-[0.16em] text-gold"
            >
              Next card
            </button>
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              className="font-mono text-[11px] tracking-[0.16em] text-lime"
            >
              {paused ? "Play the deck" : "Pause the deck"}
            </button>
          </div>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <li className="rounded-2xl border border-line bg-ink/50 px-3 py-3">
          <p className="font-mono text-[11px] text-gold">{isConnected ? "DONE" : "OPEN"}</p>
          <p className="mt-1 text-sm">Connect a wallet</p>
          <p className="mt-1 text-xs text-mist">Browser extension, or WalletConnect on a phone.</p>
        </li>
        <ShareItem
          done={done.x}
          label="Share on X"
          detail={post.tweet}
          onOpen={() => openShare("x", links.x)}
        />
        <ShareItem
          done={done.cast}
          label="Share on Farcaster"
          detail="Casts this card, image included."
          onOpen={() => openShare("cast", links.cast)}
        />
        <ShareItem
          done={done.copy}
          label="Copy this card"
          detail={copyNote ?? "Copy the card link."}
          onOpen={() => {
            void copyText(links.url).then(
              (copied) => {
                if (!copied) {
                  setCopyNote("Copy was blocked in this browser.");
                  return;
                }
                writeDone("copy");
                setCopyNote("Copied.");
              },
              () => setCopyNote("Copy was blocked in this browser."),
            );
          }}
        />
      </ul>
    </section>
  );
}

function ShareItem({
  done,
  label,
  detail,
  onOpen,
}: {
  done: boolean;
  label: string;
  detail: string;
  onOpen: () => void;
}) {
  return (
    <li className="rounded-2xl border border-line bg-ink/50 px-3 py-3">
      <p className="font-mono text-[11px] text-gold">{done ? "DONE" : "OPEN"}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-1 block text-left text-sm text-paper underline decoration-lime/50 underline-offset-4"
      >
        {label}
      </button>
      <p className="mt-1 text-xs text-mist">{detail}</p>
    </li>
  );
}
