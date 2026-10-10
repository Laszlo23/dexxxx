import { connection } from "next/server";
import { deskCard } from "@/lib/og-card";
import { parseNftQuery, readNftBinding } from "@/lib/portfolio";
import { pictureShareLine } from "@/lib/share-line";

function imageType(header: string, url: string): string {
  const typed = header.split(";")[0]?.trim().toLowerCase() ?? "";
  if (typed.startsWith("image/")) return typed;
  if (url.endsWith(".svg")) return "image/svg+xml";
  if (url.endsWith(".png")) return "image/png";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

async function cardImage(url: string): Promise<string | undefined> {
  if (!url.startsWith("https://")) return undefined;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "dexxxx-card" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return undefined;
    const type = imageType(response.headers.get("content-type") ?? "", url);
    if (!type) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 1_500_000) return undefined;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 180) return new Response("Unknown card.", { status: 400 });
  const parsed = parseNftQuery(query);
  if (!parsed) return new Response("Unknown card.", { status: 400 });
  let reading: Awaited<ReturnType<typeof readNftBinding>>;
  try {
    reading = await readNftBinding(parsed.contract, parsed.id);
  } catch {
    return deskCard({
      kicker: "ONE PICTURE",
      title: query,
      line: "The desk read this picture on Robinhood Chain.",
    });
  }
  const card = {
    kicker: reading.wallet ? "KEEPS A WALLET" : "STAYS A PICTURE",
    title: reading.name,
    line: pictureShareLine(reading),
  };
  const image = await cardImage(reading.image);
  if (!image) return deskCard(card);
  try {
    return deskCard({ ...card, image });
  } catch {
    return deskCard(card);
  }
}
