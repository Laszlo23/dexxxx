import { formatDisplay } from "@/lib/format";
import { vibeHref } from "@/config/vibe";

const SOURCE_ID = "robinhood-virtual-20260905";
const RUNTIME_ID = "v6-robinhood-20260921-r5-paid";
const SHELF_TTL_MS = 60_000;

export type VibeOdds = {
  bps: number;
  payout: number;
};

export type VibePack = {
  slug: string;
  name: string;
  symbol: string;
  image: string;
  color: string | null;
  blurb: string;
  odds: VibeOdds[];
  href: string;
  featured: boolean;
};

export type VibeShelf = {
  label: string;
  priceLabel: string;
  usdLabel: string | null;
  packs: VibePack[];
  marketHref: string;
};

let shelfCache: { at: number; shelf: VibeShelf } | null = null;

export async function loadVibeShelf(): Promise<VibeShelf | null> {
  if (shelfCache && Date.now() - shelfCache.at < SHELF_TTL_MS) return shelfCache.shelf;
  try {
    const shelf = await fetchShelf();
    if (!shelf) return shelfCache?.shelf ?? null;
    shelfCache = { at: Date.now(), shelf };
    return shelf;
  } catch {
    return shelfCache?.shelf ?? null;
  }
}

async function fetchShelf(): Promise<VibeShelf | null> {
  const page = await fetch("https://vibechain.com/market", {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!page.ok) return null;
  const html = await page.text();
  const bootPath = html.match(/\/api\/vibemarket2\/boot\?apiKey=[^"&\s]+/)?.[0];
  if (!bootPath) return null;
  const bootUrl = new URL(bootPath, "https://vibechain.com");
  if (bootUrl.origin !== "https://vibechain.com") return null;
  const boot = await fetch(bootUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!boot.ok) return null;
  return parseShelf(await boot.json());
}

function parseShelf(payload: unknown): VibeShelf | null {
  if (!isRecord(payload)) return null;
  const sources = recordAt(payload.sources, "sources");
  const source = sources.find((item) => item.id === SOURCE_ID && item.chainId === 4663);
  if (!source) return null;
  const versions = Array.isArray(source.versions) ? source.versions.filter(isRecord) : [];
  const version = versions.find((item) => item.id === RUNTIME_ID && item.launchTarget === true);
  if (!version || typeof version.market !== "string" || typeof version.label !== "string") return null;
  const manifest = isRecord(version.immutableManifest) ? version.immutableManifest : null;
  const weiText = manifest && typeof manifest.ethPerPackWei === "string" ? manifest.ethPerPackWei : null;
  if (!weiText || !/^[1-9]\d{0,30}$/.test(weiText)) return null;
  const pages = isRecord(payload.pages) ? payload.pages : null;
  if (!pages) return null;
  const market = version.market.toLowerCase();
  const page = Object.entries(pages).find(
    ([key, value]) => key.toLowerCase().includes(`market=${market}`) && isRecord(value) && Array.isArray(value.packs),
  )?.[1];
  if (!isRecord(page) || !Array.isArray(page.packs)) return null;
  const packs = page.packs.flatMap((item) => {
    const pack = parsePack(item);
    return pack ? [pack] : [];
  });
  if (packs.length === 0) return null;
  packs.sort((left, right) => {
    if (left.featured) return -1;
    if (right.featured) return 1;
    return left.name.localeCompare(right.name);
  });
  const wei = BigInt(weiText);
  const eth = Number(wei) / 1e18;
  const ethUsd = typeof source.ethUsd === "number" && source.ethUsd > 0 ? source.ethUsd : null;
  return {
    label: version.label,
    priceLabel: `${formatDisplay(wei, 18)} ETH`,
    usdLabel: ethUsd ? `about $${(eth * ethUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
    packs,
    marketHref: vibeHref(),
  };
}

function parsePack(value: unknown): VibePack | null {
  if (!isRecord(value)) return null;
  if (value.hidden === true || value.isHidden === true || value.isNSFW === true) return null;
  if (typeof value.canonicalSlug !== "string" || typeof value.name !== "string") return null;
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (/down syndrome/i.test(`${value.name} ${description}`)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.canonicalSlug)) return null;
  if (typeof value.image !== "string" || !value.image.startsWith("https://")) return null;
  const oddsBps = numberList(value.oddsBps);
  const payouts = numberList(value.payouts);
  if (!oddsBps || !payouts || oddsBps.length === 0 || oddsBps.length !== payouts.length) return null;
  const color = typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : null;
  return {
    slug: value.canonicalSlug,
    name: value.name,
    symbol: typeof value.symbol === "string" ? value.symbol : "",
    image: value.image,
    color,
    blurb: clip(description),
    odds: oddsBps.map((bps, index) => ({ bps, payout: payouts[index] ?? 0 })),
    href: vibeHref(`/packs/${value.canonicalSlug}`),
    featured: value.canonicalSlug === "vibe-market",
  };
}

function numberList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const numbers = value.filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item >= 0);
  return numbers.length === value.length ? numbers : null;
}

function clip(value: string): string {
  if (value.length <= 140) return value;
  const cut = value.slice(0, 140);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

function recordAt(value: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const list = value[key];
  return Array.isArray(list) ? list.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
