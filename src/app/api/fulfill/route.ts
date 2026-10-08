import { connection } from "next/server";
import { isAddress, type Address } from "viem";
import { fulfillmentData, offerFulfillmentData } from "@/lib/opensea";
import type { OrderSide } from "@/lib/listing";

function isSide(value: string | undefined): value is OrderSide {
  return value === "listing" || value === "offer";
}

export async function POST(request: Request) {
  await connection();
  const body = (await request.json()) as {
    side?: string;
    hash?: string;
    protocolAddress?: string;
    fulfiller?: string;
    nft?: string;
    tokenId?: string;
  };
  const side: OrderSide = body.side === undefined ? "listing" : isSide(body.side) ? body.side : "listing";
  if (body.side !== undefined && !isSide(body.side)) {
    return Response.json({ error: "Unknown order side." }, { status: 400 });
  }
  if (!body.hash || !body.hash.startsWith("0x")) {
    return Response.json({ error: "Missing order hash." }, { status: 400 });
  }
  if (!body.protocolAddress || !isAddress(body.protocolAddress)) {
    return Response.json({ error: "Missing protocol address." }, { status: 400 });
  }
  if (!body.fulfiller || !isAddress(body.fulfiller)) {
    return Response.json({ error: "Connect a wallet before trading." }, { status: 400 });
  }
  if (!process.env.OPENSEA_API_KEY) {
    return Response.json(
      { error: "OpenSea is not configured on this server yet." },
      { status: 501 },
    );
  }

  if (side === "offer") {
    if (!body.nft || !isAddress(body.nft) || !body.tokenId || !/^\d+$/.test(body.tokenId)) {
      return Response.json({ error: "Name the token you are selling." }, { status: 400 });
    }
    const built = await offerFulfillmentData({
      hash: body.hash,
      protocolAddress: body.protocolAddress as Address,
      fulfiller: body.fulfiller as Address,
      nft: body.nft as Address,
      tokenId: body.tokenId,
    });
    if (!built.ok) {
      return Response.json({ error: built.error }, { status: 502 });
    }
    return Response.json(built.purchase);
  }

  const tx = await fulfillmentData({
    hash: body.hash,
    protocolAddress: body.protocolAddress as Address,
    fulfiller: body.fulfiller as Address,
  });
  if (!tx) {
    return Response.json({ error: "OpenSea could not build this purchase." }, { status: 502 });
  }
  return Response.json(tx);
}
