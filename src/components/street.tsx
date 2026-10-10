import { PassOn } from "@/components/pass-on";
import { SOCIALS, SocialIcon } from "@/components/site-footer";
import { StreetPicks, StreetTape } from "@/components/street-picks";

const ROOMS = {
  X: "The desk's account",
  Farcaster: "The auraos channel",
  Discord: "Walk in and talk",
  Telegram: "The group",
  GitHub: "The source",
} as const satisfies Record<(typeof SOCIALS)[number]["label"], string>;

export function Street() {
  return (
    <section id="street" className="street-night mt-6 overflow-hidden rounded-[28px] border border-lime/40">
      <StreetTape />
      <div className="px-5 py-6">
        <p className="font-mono text-3xl text-lime">IV</p>
        <p className="mt-3 font-mono text-[11px] tracking-[0.22em] text-gold">THE STREET</p>
        <h2 className="mt-2 text-3xl tracking-tight">The street stays lit.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-mist">
          Two pictures are already out. Pass the one that keeps a wallet, the one drawn in the contract, or the desk itself.
        </p>
        <StreetPicks />
        <div className="mt-3">
          <PassOn
            title="Pass dex xxx"
            line="Robinhood Chain, with love. Swaps, NFT wallets, and the funds bound to a picture."
            path="/"
            cardSrc="/card/home"
          />
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Rooms">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-full flex-col gap-3 rounded-3xl border border-lime/30 bg-ink/70 px-4 py-4 hover:border-lime hover:bg-lime/10"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-ink">
                  <SocialIcon name={social.label} />
                </span>
                <span>
                  <span className="block text-sm text-paper">{social.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-mist">{ROOMS[social.label]}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
