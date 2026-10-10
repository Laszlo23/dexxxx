import { connection } from "next/server";
import sharp from "sharp";
import { deskCard } from "@/lib/og-card";
import { parseNftQuery, readNftBinding } from "@/lib/portfolio";
import { pictureShareLine } from "@/lib/share-line";

async function cardImage(url: string): Promise<string | undefined> {
  if (!url.startsWith("https://")) return undefined;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "dexxxx-card" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return undefined;
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 2_000_000) return undefined;
    const png = await sharp(bytes, { density: 240 })
      .resize(420, 630, { fit: "contain", background: { r: 9, g: 11, b: 8, alpha: 1 } })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
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
