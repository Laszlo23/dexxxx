import { isAddress, type Address } from "viem";
import { connection, NextRequest } from "next/server";
import { findCollection } from "@/data/collections";
import { ownedTokenIds } from "@/lib/collections";

export async function GET(request: NextRequest) {
  await connection();
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const owner = request.nextUrl.searchParams.get("owner") ?? "";
  const collection = findCollection(slug);
  if (!collection) {
    return Response.json({ error: "Unknown collection." }, { status: 404 });
  }
  if (!isAddress(owner)) {
    return Response.json({ error: "Bad owner." }, { status: 400 });
  }
  try {
    const owned = await ownedTokenIds(slug, owner as Address);
    return Response.json(owned);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read owners.";
    return Response.json({ error: message }, { status: 502 });
  }
}
