import Link from "next/link";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Rare Hood castle game",
  description:
    "Play your Rare Friend through five castles. Lure the guards with a coin, beat the clock, and bank simulated HOOD. Robinhood Chain, generation 1 or higher.",
  path: "/rfgame",
  card: "rfgame",
});

const CASTLES = [
  { name: "Gatehouse", guards: "1 guard", clock: "1:30", pay: "5" },
  { name: "Great Hall", guards: "2 guards", clock: "1:15", pay: "8" },
  { name: "Treasury", guards: "3 guards", clock: "1:02", pay: "12" },
  { name: "Dungeon", guards: "3 guards", clock: "0:52", pay: "16" },
  { name: "Throne Vault", guards: "4 guards", clock: "0:44", pay: "24" },
] as const;

const CATCHES = [
  {
    title: "The beam filled",
    body: "A guard held the light on you until the alert meter topped out. Sneaking only slows it.",
  },
  {
    title: "You touched a guard",
    body: "Stepping into a patrol, or into the one you lured, ends the castle immediately.",
  },
  {
    title: "The clock ran out",
    body: "Pouches still in the rooms, or the gate still ahead, both fail when the timer hits zero.",
  },
] as const;

export default function RareHoodPage() {
  return (
    <div className="hood-night text-paper">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-6 lg:py-16">
        <div>
          <p className="font-mono text-[11px] tracking-[0.28em] text-[#7af7ff]">RARE HOOD · ROBINHOOD 4663</p>
          <h1 className="mt-3 max-w-xl text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Steal the castle.
            <span className="block text-[#ffd24a]">Stay out of the light.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#d8ccff]">
            Your Rare Friend wears the hood. Five castles, beams that change their routes, and a coin you
            throw so a guard walks off to look. Clear the gate before the clock dies.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/rfgame/play/index.html"
              className="rounded-full bg-[#ffd24a] px-6 py-3 text-sm font-semibold text-[#1a1030] shadow-[4px_4px_0_#ff2d8a]"
            >
              Enter the Gatehouse
            </a>
            <Link href="/friends" className="rounded-full border border-[#6a48e8] px-5 py-3 text-sm text-[#d8ccff]">
              Browse Rare Friends
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11px] tracking-wide text-[#9aa392]">
            Needs a Generations NFT, generation 1 or higher. HOOD on the score is simulated.
          </p>
          <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-[#ffd24a]">
            Made with love for the friends who wear the hood.
          </p>
        </div>
        <CastleStage />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-12 lg:grid-cols-3 lg:px-6">
        {[
          ["01 Throw", "Aim a coin. A cyan ring means that guard hears it and leaves the patrol to look."],
          ["02 Slip", "Take the pouches while the beam is pointed at the coin, not at you."],
          ["03 Leave", "The gate pays the castle, plus 1 simulated HOOD for every 10 seconds still on the clock."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-[#6a48e8]/70 bg-[#12081f]/80 p-5">
            <h2 className="font-mono text-sm tracking-[0.16em] text-[#7af7ff]">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#d8ccff]">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 lg:px-6">
        <p className="font-mono text-[11px] tracking-[0.22em] text-[#ffd24a]">FIVE CLOCKS</p>
        <h2 className="mt-2 text-2xl tracking-tight">Each castle is shorter than the last.</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CASTLES.map((castle, index) => (
            <article key={castle.name} className="rounded-3xl border border-[#2c2048] bg-[#12081f]/90 p-4">
              <p className="font-mono text-[11px] text-[#7af7ff]">0{index + 1}</p>
              <h3 className="mt-1 text-lg">{castle.name}</h3>
              <p className="mt-3 font-mono text-2xl text-[#ffd24a]">{castle.clock}</p>
              <p className="mt-2 text-xs text-[#9aa392]">
                {castle.guards} · {castle.pay} simulated HOOD
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-6">
        <div className="rounded-3xl border border-[#ff2d8a]/50 bg-[#1a0818]/80 p-6">
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#ff4d8d]">WHEN IT ENDS</p>
          <h2 className="mt-2 text-2xl tracking-tight">The catch screen names the reason.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#d8ccff]">
            A quiet getaway, alert never filled, adds 3 simulated HOOD. Coins reset every castle. Nothing is sent
            to a wallet.
          </p>
        </div>
        <div className="grid gap-3">
          {CATCHES.map((item) => (
            <article key={item.title} className="rounded-3xl border border-[#2c2048] bg-[#12081f]/80 px-5 py-4">
              <h3 className="text-[#ffd24a]">{item.title}</h3>
              <p className="mt-1 text-sm text-[#d8ccff]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CastleStage() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border-4 border-[#ff2d8a] bg-[#070414] shadow-[8px_8px_0_#3a1464]">
      <div className="flex items-center justify-between border-b border-[#6a48e8]/50 px-4 py-3 font-mono text-[11px] tracking-wide">
        <span className="text-[#ffd24a]">GATEHOUSE</span>
        <span className="text-[#7af7ff]">1:30</span>
      </div>
      <svg viewBox="0 0 480 340" className="h-auto w-full" role="img" aria-label="A hooded friend sneaking under a guard beam">
        <defs>
          <pattern id="hood-tiles" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#140c28" />
            <path d="M24 0H0V24" fill="none" stroke="#2a1860" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="480" height="340" fill="url(#hood-tiles)" />
        <rect y="118" width="480" height="16" fill="#2a1860" />
        <rect x="168" y="118" width="28" height="16" fill="#140c28" />
        <g className="hood-beam">
          <polygon points="86,214 250,150 292,248" fill="#ffd24a" opacity="0.28" />
          <polygon points="86,214 210,176 236,230" fill="#fff6c2" opacity="0.18" />
        </g>
        <g>
          <rect x="62" y="188" width="48" height="40" fill="#5b3fd4" />
          <rect x="70" y="176" width="32" height="20" fill="#8d6bff" />
          <rect x="74" y="182" width="24" height="6" fill="#ffd24a" />
          <rect x="78" y="168" width="8" height="10" fill="#ffd24a" />
        </g>
        <g>
          <rect x="300" y="196" width="36" height="28" fill="#1a1030" />
          <rect x="304" y="176" width="28" height="28" fill="#f4f0ff" />
          <rect x="308" y="164" width="20" height="16" fill="#ff2d8a" />
          <rect x="292" y="188" width="14" height="22" fill="#ff2d8a" />
        </g>
        <g className="hood-coin">
          <circle cx="214" cy="168" r="10" fill="#c89216" />
          <circle cx="214" cy="168" r="6" fill="#ffd24a" />
        </g>
        <path d="M86 200 C 140 150, 180 150, 214 168" fill="none" stroke="#7af7ff" strokeWidth="2" strokeDasharray="4 4" />
        <rect x="392" y="250" width="28" height="40" fill="#3a1464" />
        <rect x="398" y="258" width="16" height="22" fill="#ffd24a" />
      </svg>
      <p className="border-t border-[#6a48e8]/50 px-4 py-3 text-xs text-[#d8ccff]">
        Cyan means the amber guard will leave the hall and look at the coin.
      </p>
    </div>
  );
}
