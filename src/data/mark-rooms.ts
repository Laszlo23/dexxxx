import type { NftReading } from "@/lib/portfolio";

export const MARK_KEY = "dexxxx-mark-run";

export type MarkSave = {
  cleared: string[];
  markQuery: string;
  markLine: string;
  markImage: string;
  passed: boolean;
};

export const EMPTY_MARK: MarkSave = {
  cleared: [],
  markQuery: "",
  markLine: "",
  markImage: "",
  passed: false,
};

type RoomBase = { id: string; numeral: string; title: string; lede: string };

export type MarkRoom =
  | (RoomBase & { kind: "which-wallet"; left: string; right: string })
  | (RoomBase & { kind: "what-bound"; query: string })
  | (RoomBase & { kind: "what-use"; query: string })
  | (RoomBase & { kind: "keeps-wallet"; sample: string; mintHref: string })
  | (RoomBase & { kind: "pass" });

export const ROOMS: readonly MarkRoom[] = [
  {
    id: "gate",
    numeral: "I",
    title: "The gate",
    lede: "Two pictures. One of them keeps a wallet.",
    kind: "which-wallet",
    left: "CCFF00 #1",
    right: "Rare Friends Genesis #1",
  },
  {
    id: "purse",
    numeral: "II",
    title: "The purse",
    lede: "What is bound to this picture?",
    kind: "what-bound",
    query: "CCFF00 #1",
  },
  {
    id: "drawing",
    numeral: "III",
    title: "The drawing",
    lede: "What does this picture do?",
    kind: "what-use",
    query: "Rare Friends Genesis #1",
  },
  {
    id: "mark",
    numeral: "IV",
    title: "Your mark",
    lede: "Paste a picture. Say whether it keeps a wallet before the desk shows the account.",
    kind: "keeps-wallet",
    sample: "CCFF00 #2",
    mintHref: "/collections/ccff00",
  },
  {
    id: "pass",
    numeral: "V",
    title: "The pass",
    lede: "The ticket is the run. Send it, or copy the link.",
    kind: "pass",
  },
];

export function readMarkSave(raw: string | null): MarkSave {
  if (!raw) return EMPTY_MARK;
  try {
    const parsed = JSON.parse(raw) as Partial<MarkSave>;
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter((id) => typeof id === "string") : [],
      markQuery: typeof parsed.markQuery === "string" ? parsed.markQuery : "",
      markLine: typeof parsed.markLine === "string" ? parsed.markLine : "",
      markImage: typeof parsed.markImage === "string" ? parsed.markImage : "",
      passed: Boolean(parsed.passed),
    };
  } catch {
    return EMPTY_MARK;
  }
}

export function boundLabel(reading: NftReading): string {
  const funds = reading.wallet?.holdings
    .slice(0, 2)
    .map((holding) => `${holding.display} ${holding.symbol}`)
    .join(" and ");
  return funds || "Nothing is bound";
}

export function boundChoices(reading: NftReading): { correct: string; choices: string[] } {
  const correct = boundLabel(reading);
  const decoys = ["Nothing is bound", "1 ETH", "100 USDG", "10,000 CCFF00"].filter((item) => item !== correct);
  return { correct, choices: spread([correct, decoys[0] ?? "1 ETH", decoys[1] ?? "100 USDG"], reading.name) };
}

export function useChoices(reading: NftReading): { correct: string; choices: string[] } {
  const correct = reading.use?.title ?? "No use checked";
  const decoy = correct === "The picture is the wallet" ? "Drawn in the contract" : "The picture is the wallet";
  return { correct, choices: spread([correct, decoy], reading.name) };
}

export function walletPick(left: NftReading, right: NftReading, leftQuery: string, rightQuery: string): string | null {
  const leftKeeps = left.wallet !== null;
  const rightKeeps = right.wallet !== null;
  if (leftKeeps === rightKeeps) return null;
  return leftKeeps ? leftQuery : rightQuery;
}

export function keepsLabel(reading: NftReading): string {
  return reading.wallet ? "It keeps a wallet" : "It stays a picture";
}

export function roomVerdict(reading: NftReading): string {
  if (reading.wallet) {
    const funds = boundLabel(reading);
    const use = reading.use?.title;
    if (use && funds !== "Nothing is bound") return `${reading.name}. ${use}. ${funds} bound to the picture.`;
    if (use) return `${reading.name}. ${use}.`;
    if (funds !== "Nothing is bound") return `${reading.name} keeps ${funds}.`;
    return `${reading.name} keeps a wallet. The tracked balances in it are zero.`;
  }
  if (reading.use) return `${reading.name}. ${reading.use.title}.`;
  return `${reading.name} stays a picture. This desk has not found a wallet bound to it.`;
}

export function runLine(cleared: number, markLine: string): string {
  const rooms = `Cleared ${cleared} of 4 rooms on the street.`;
  return markLine ? `${rooms} ${markLine}` : rooms;
}

function spread(choices: string[], seed: string): string[] {
  const unique = choices.filter((choice, index) => choices.indexOf(choice) === index);
  const shift = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % unique.length;
  return unique.map((_, index) => unique[(index + shift) % unique.length] ?? unique[0] ?? "");
}
