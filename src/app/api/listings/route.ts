import { isAddress } from "viem";
import { connection, NextRequest } from "next/server";
import { COLLECTIONS } from "@/data/collections";
import { openseaItem } from "@/lib/format";
import { bestAsks, bestBids, bestItemOffers, listingsFor } from "@/lib/opensea";

export async function GET(request: NextRequest) {
  await connection();
  const address = request.nextUrl.searchParams.get("address") ?? "";
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
    .slice(0, 24);

  if (!isAddress(address)) {
    return Response.json({ error: "Bad contract." }, { status: 400 });
  }
  const collection = COLLECTIONS.find(
    (item) => item.address.toLowerCase() === address.toLowerCase(),
  );
  if (!collection) {
    return Response.json({ error: "Collection is not on the board." }, { status: 404 });
  }

  const slug = collection.openseaSlug;
  if (request.nextUrl.searchParams.get("itemOffers") === "1") {
    const itemOffers = slug ? await bestItemOffers(slug, ids.slice(0, 12)) : {};
    return Response.json({ itemOffers, live: Boolean(process.env.OPENSEA_API_KEY) });
  }
  const [listings, asks, bids] = slug
    ? await Promise.all([listingsFor(slug, ids), bestAsks(slug, 8), bestBids(slug, 3)])
    : [{}, [], []];
  const links = Object.fromEntries(ids.map((id) => [id, openseaItem(address, id)]));
  const askLinks = Object.fromEntries(asks.map((ask) => [ask.tokenId, openseaItem(address, ask.tokenId)]));
  return Response.json({
    listings,
    asks,
    bids,
    links: { ...links, ...askLinks },
    live: Boolean(process.env.OPENSEA_API_KEY),
  });
}
