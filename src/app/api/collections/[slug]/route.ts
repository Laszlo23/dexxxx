import { connection, NextRequest } from "next/server";
import { findCollection } from "@/data/collections";
import { readSupply, readTokenPage } from "@/lib/collections";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: Context) {
  await connection();
  const { slug } = await context.params;
  const collection = findCollection(slug);
  if (!collection) {
    return Response.json({ error: "Unknown collection." }, { status: 404 });
  }

  const cursorRaw = Number(request.nextUrl.searchParams.get("cursor") ?? collection.idStart);
  const cursor = Number.isInteger(cursorRaw) ? cursorRaw : collection.idStart;
  try {
    const page = await readTokenPage(collection, cursor, 24);
    const supply = page.supply;
    return Response.json({
      collection: {
        slug: collection.slug,
        name: collection.name,
        symbol: collection.symbol,
        address: collection.address,
        hero: collection.hero,
        blurb: collection.blurb,
        idStart: collection.idStart,
      },
      supply,
      tokens: page.tokens,
      nextCursor: page.nextCursor,
      cursor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this collection.";
    try {
      const supply = await readSupply(collection);
      return Response.json({ error: message, supply }, { status: 502 });
    } catch {
      return Response.json({ error: message }, { status: 502 });
    }
  }
}
