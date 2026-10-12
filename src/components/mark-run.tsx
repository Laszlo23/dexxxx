"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NftImage } from "@/components/nft-image";
import { PassOn } from "@/components/pass-on";
import {
  EMPTY_MARK,
  MARK_KEY,
  ROOMS,
  boundChoices,
  keepsLabel,
  readMarkSave,
  roomVerdict,
  runLine,
  useChoices,
  walletPick,
  type MarkRoom,
  type MarkSave,
} from "@/data/mark-rooms";
import type { NftReading } from "@/lib/portfolio";
import { pictureShareLine } from "@/lib/share-line";

type Ask = { status: "ask" };
type Reading = { status: "reading" };
type Reveal = { status: "reveal"; correct: boolean; readings: NftReading[]; note: string };
type Miss = { status: "miss"; message: string };
type Phase = Ask | Reading | Reveal | Miss;

const KEEPS = ["It keeps a wallet", "It stays a picture"] as const;

export function MarkRun() {
  const [save, setSave] = useState<MarkSave>(EMPTY_MARK);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "ask" });
  const [preview, setPreview] = useState<{ correct: string; choices: string[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [held, setHeld] = useState<NftReading | null>(null);
  const [linger, setLinger] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const room = ROOMS.find((item) => !save.cleared.includes(item.id));
  const playing = ROOMS.find((item) => item.id === linger) ?? room;
  const scored = save.cleared.filter((id) => id !== "pass").length;

  useEffect(() => {
    setSave(readMarkSave(localStorage.getItem(MARK_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (linger) return;
    setPhase({ status: "ask" });
    setPreview(null);
    setHeld(null);
    const current = ROOMS.find((item) => item.id === room?.id);
    if (!current || (current.kind !== "what-bound" && current.kind !== "what-use")) return;
    const query = current.query;
    const kind = current.kind;
    let live = true;
    setPhase({ status: "reading" });
    void readQuery(query)
      .then((reading) => {
        if (!live) return;
        setPreview(kind === "what-bound" ? boundChoices(reading) : useChoices(reading));
        setHeld(reading);
        setPhase({ status: "ask" });
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setPhase({ status: "miss", message: reason instanceof Error ? reason.message : "That picture did not read." });
      });
    return () => {
      live = false;
    };
  }, [room, linger, attempt]);

  function commit(next: MarkSave) {
    localStorage.setItem(MARK_KEY, JSON.stringify(next));
    setSave(next);
  }

  function clearRoom(id: string, extra?: Partial<MarkSave>) {
    const cleared = save.cleared.includes(id) ? save.cleared : [...save.cleared, id];
    commit({ ...save, ...extra, cleared });
  }

  async function choosePair(picked: string) {
    if (!room || room.kind !== "which-wallet" || phase.status === "reading") return;
    setPhase({ status: "reading" });
    try {
      const [left, right] = await Promise.all([readQuery(room.left), readQuery(room.right)]);
      const answer = walletPick(left, right, room.left, room.right);
      if (!answer) {
        setPhase({
          status: "reveal",
          correct: false,
          readings: [left, right],
          note: "The chain did not separate these pictures. Try the room again.",
        });
        return;
      }
      const correct = picked === answer;
      if (correct) {
        setLinger(room.id);
        clearRoom(room.id);
      }
      setPhase({
        status: "reveal",
        correct,
        readings: [left, right],
        note: correct ? "That picture keeps the wallet." : `${answer} keeps the wallet.`,
      });
    } catch (reason: unknown) {
      setPhase({ status: "miss", message: reason instanceof Error ? reason.message : "That picture did not read." });
    }
  }

  function chooseLabeled(picked: string) {
    if (!room || !preview || !held || phase.status === "reading") return;
    const correct = picked === preview.correct;
    if (correct) {
      setLinger(room.id);
      clearRoom(room.id);
    }
    setPhase({
      status: "reveal",
      correct,
      readings: [held],
      note: correct ? roomVerdict(held) : `The desk read: ${preview.correct}.`,
    });
  }

  async function holdMark(query: string) {
    const trimmed = query.trim();
    if (!trimmed || phase.status === "reading") return;
    setDraft(trimmed);
    setHeld(null);
    setPhase({ status: "reading" });
    try {
      const reading = await readQuery(trimmed);
      setHeld(reading);
      setPhase({ status: "ask" });
    } catch (reason: unknown) {
      setPhase({ status: "miss", message: reason instanceof Error ? reason.message : "That picture did not read." });
    }
  }

  function chooseKeeps(picked: string) {
    if (!room || room.kind !== "keeps-wallet" || !held) return;
    const answer = keepsLabel(held);
    const correct = picked === answer;
    if (correct) {
      setLinger(room.id);
      clearRoom(room.id, {
        markQuery: draft.trim(),
        markLine: pictureShareLine(held),
        markImage: held.image,
      });
    }
    setPhase({
      status: "reveal",
      correct,
      readings: [held],
      note: roomVerdict(held),
    });
  }

  function again() {
    setPhase({ status: "ask" });
    if (playing?.kind === "keeps-wallet") setHeld(null);
    setAttempt((current) => current + 1);
  }

  function advance() {
    const next = room;
    setLinger(null);
    setPreview(null);
    setHeld(null);
    if (next && (next.kind === "what-bound" || next.kind === "what-use")) {
      setPhase({ status: "reading" });
    } else {
      setPhase({ status: "ask" });
    }
  }

  function reset() {
    localStorage.removeItem(MARK_KEY);
    setSave(EMPTY_MARK);
    setDraft("");
    setHeld(null);
    setPreview(null);
    setLinger(null);
    setPhase({ status: "ask" });
  }

  if (!ready) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-mist">Opening the street…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <section className="street-night overflow-hidden rounded-[28px] border border-lime/40 px-5 py-6">
        <p className="font-mono text-[11px] tracking-[0.22em] text-gold">THE MARK</p>
        <h1 className="mt-2 text-4xl tracking-tight">Five rooms. The chain keeps score.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-mist">
          Some pictures keep a wallet. Some stay pictures. Mint one if you want a mark of your own. The wallet confirms that. This run only reads.
        </p>
        <ol className="mt-5 flex gap-2" aria-label="Rooms">
          {ROOMS.map((item) => {
            const done = save.cleared.includes(item.id);
            const current = playing?.id === item.id;
            return (
              <li
                key={item.id}
                className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-xs ${
                  done ? "border-lime bg-lime text-ink" : current ? "border-lime text-lime" : "border-line text-mist"
                }`}
              >
                {item.numeral}
              </li>
            );
          })}
        </ol>

        {playing ? (
          <RoomPlay
            room={playing}
            phase={phase}
            preview={preview}
            draft={draft}
            held={held}
            line={runLine(scored, save.markLine)}
            cardSrc={save.markQuery ? `/card/picture?q=${encodeURIComponent(save.markQuery)}` : "/card/mark"}
            image={save.markImage}
            onDraft={setDraft}
            onPair={choosePair}
            onLabeled={chooseLabeled}
            onHold={holdMark}
            onKeeps={chooseKeeps}
            onAgain={again}
            onNext={advance}
            onPassed={() => clearRoom("pass", { passed: true })}
          />
        ) : (
          <div className="mt-6">
            <p className="font-mono text-[11px] tracking-[0.18em] text-lime">THE RUN IS PASSED</p>
            <p className="mt-2 text-sm leading-6 text-mist">{runLine(scored, save.markLine)}</p>
            <PassOn
              title="Pass this run"
              line={runLine(scored, save.markLine)}
              path="/mark"
              image={save.markImage || undefined}
              kicker="THE RUN"
              cardSrc={save.markQuery ? `/card/picture?q=${encodeURIComponent(save.markQuery)}` : "/card/mark"}
            />
            <button type="button" onClick={reset} className="mt-4 rounded-full border border-line px-4 py-2 text-sm text-paper">
              Run it again
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function RoomPlay({
  room,
  phase,
  preview,
  draft,
  held,
  line,
  cardSrc,
  image,
  onDraft,
  onPair,
  onLabeled,
  onHold,
  onKeeps,
  onAgain,
  onNext,
  onPassed,
}: {
  room: MarkRoom;
  phase: Phase;
  preview: { correct: string; choices: string[] } | null;
  draft: string;
  held: NftReading | null;
  line: string;
  cardSrc: string;
  image: string;
  onDraft: (value: string) => void;
  onPair: (picked: string) => void;
  onLabeled: (picked: string) => void;
  onHold: (query: string) => void;
  onKeeps: (picked: string) => void;
  onAgain: () => void;
  onNext: () => void;
  onPassed: () => void;
}) {
  return (
    <div className="mt-6">
      <p className="font-mono text-3xl text-lime">{room.numeral}</p>
      <h2 className="mt-2 text-2xl tracking-tight">{room.title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-mist">{room.lede}</p>
      {phase.status === "reading" ? <p className="mt-4 font-mono text-[11px] tracking-[0.16em] text-lime">Reading the picture.</p> : null}
      {phase.status === "miss" ? (
        <div className="mt-4">
          <p className="text-sm text-danger">{phase.message}</p>
          <button type="button" onClick={onAgain} className="mt-3 rounded-full border border-line px-4 py-2 text-sm text-paper">
            Try this room again
          </button>
        </div>
      ) : null}
      {phase.status === "reveal" ? (
        <Reveal phase={phase} onAgain={onAgain} onNext={onNext} />
      ) : null}
      {phase.status === "ask" ? (
        <Ask
          room={room}
          preview={preview}
          draft={draft}
          held={held}
          line={line}
          cardSrc={cardSrc}
          image={image}
          onDraft={onDraft}
          onPair={onPair}
          onLabeled={onLabeled}
          onHold={onHold}
          onKeeps={onKeeps}
          onPassed={onPassed}
        />
      ) : null}
    </div>
  );
}

function Ask({
  room,
  preview,
  draft,
  held,
  line,
  cardSrc,
  image,
  onDraft,
  onPair,
  onLabeled,
  onHold,
  onKeeps,
  onPassed,
}: {
  room: MarkRoom;
  preview: { correct: string; choices: string[] } | null;
  draft: string;
  held: NftReading | null;
  line: string;
  cardSrc: string;
  image: string;
  onDraft: (value: string) => void;
  onPair: (picked: string) => void;
  onLabeled: (picked: string) => void;
  onHold: (query: string) => void;
  onKeeps: (picked: string) => void;
  onPassed: () => void;
}) {
  switch (room.kind) {
    case "which-wallet":
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          <Choice label={room.left} onPick={() => onPair(room.left)} />
          <Choice label={room.right} onPick={() => onPair(room.right)} />
        </div>
      );
    case "what-bound":
    case "what-use":
      if (!preview) return null;
      return (
        <div className="mt-4 flex flex-wrap gap-2">
          {preview.choices.map((choice) => (
            <Choice key={choice} label={choice} onPick={() => onLabeled(choice)} />
          ))}
        </div>
      );
    case "keeps-wallet":
      return (
        <div className="mt-4">
          {held ? (
            <div className="flex flex-wrap gap-2">
              {KEEPS.map((choice) => (
                <Choice key={choice} label={choice} onPick={() => onKeeps(choice)} />
              ))}
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onHold(draft);
              }}
            >
              <label className="block max-w-xl">
                <span className="font-mono text-[11px] tracking-[0.18em] text-lime">THE PICTURE</span>
                <input
                  value={draft}
                  onChange={(event) => onDraft(event.target.value)}
                  spellCheck={false}
                  placeholder={room.sample}
                  aria-label="NFT"
                  className="mt-2 block w-full rounded-2xl border border-line bg-ink px-4 py-3 font-mono text-sm text-paper outline-none"
                />
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="submit" className="rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink">
                  Read the mark
                </button>
                <button type="button" onClick={() => onHold(room.sample)} className="rounded-full border border-line px-3 py-2 font-mono text-[11px] text-mist">
                  {room.sample}
                </button>
                <Link href={room.mintHref} className="rounded-full border border-gold/60 px-3 py-2 text-sm text-gold">
                  Mint a mark
                </Link>
              </div>
            </form>
          )}
        </div>
      );
    case "pass":
      return (
        <PassOn
          title="Pass this run"
          line={line}
          path="/mark"
          image={image || undefined}
          kicker="THE RUN"
          cardSrc={cardSrc}
          onPassed={onPassed}
        />
      );
    default: {
      const unexpected: never = room;
      return unexpected;
    }
  }
}

function Choice({ label, onPick }: { label: string; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="rounded-full border border-lime/40 px-4 py-2 text-sm text-paper hover:border-lime hover:text-lime">
      {label}
    </button>
  );
}

function Reveal({ phase, onAgain, onNext }: { phase: Reveal; onAgain: () => void; onNext: () => void }) {
  return (
    <div className="mt-4">
      <p className={`text-sm leading-6 ${phase.correct ? "text-lime" : "text-gold"}`}>{phase.note}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {phase.readings.map((reading) => (
          <li key={`${reading.contract}-${reading.id}`} className="overflow-hidden rounded-3xl border border-line bg-ink">
            <div className="relative h-40">
              <div className="absolute inset-0">
                <NftImage src={reading.image} alt="" />
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-paper">{reading.name}</p>
              <p className="mt-1 text-sm leading-6 text-mist">{roomVerdict(reading)}</p>
            </div>
          </li>
        ))}
      </ul>
      {phase.correct ? (
        <button type="button" onClick={onNext} className="mt-3 rounded-full bg-lime px-4 py-2 text-sm font-medium text-ink">
          Next room
        </button>
      ) : (
        <button type="button" onClick={onAgain} className="mt-3 rounded-full border border-line px-4 py-2 text-sm text-paper">
          Try this room again
        </button>
      )}
    </div>
  );
}

async function readQuery(query: string): Promise<NftReading> {
  const response = await fetch(`/api/bound?q=${encodeURIComponent(query)}`);
  const body = (await response.json()) as NftReading & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "That picture did not read.");
  return body;
}
