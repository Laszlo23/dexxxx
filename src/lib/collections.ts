import type { Address } from "viem";
import { erc721Abi } from "@/config/abis";
import {
  COLLECTIONS,
  findCollection,
  type NftCollection,
  type SupplyFn,
} from "@/data/collections";
import { mapPool, readMetadata, type NftMetadata } from "@/lib/metadata";
import { publicClient } from "@/lib/public-client";

export type TokenCard = NftMetadata & {
  id: string;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled supply reader: ${String(value)}`);
}

async function readTokenUris(address: Address, ids: readonly number[]) {
  return mapPool(ids, 4, async (id) => {
    try {
      const result = await publicClient.readContract({
        address,
        abi: erc721Abi,
        functionName: "tokenURI",
        args: [BigInt(id)],
      });
      return { status: "success" as const, result };
    } catch {
      return { status: "failure" as const, result: undefined };
    }
  });
}

export async function readSupply(collection: NftCollection): Promise<number> {
  const fn: SupplyFn = collection.supplyFn;
  switch (fn) {
    case "idSpan": {
      if (collection.idEnd === null) {
        throw new Error(`${collection.slug} is missing an id range`);
      }
      return collection.idEnd - collection.idStart + 1;
    }
    case "totalSupply":
    case "totalMinted":
    case "maxSupply": {
      const value = await publicClient.readContract({
        address: collection.address,
        abi: erc721Abi,
        functionName: fn,
      });
      return Number(value);
    }
    default:
      return assertNever(fn);
  }
}

export function lastTokenId(collection: NftCollection, supply: number): number {
  if (collection.supplyFn === "idSpan" && collection.idEnd !== null) {
    return collection.idEnd;
  }
  return collection.idStart + supply - 1;
}

export async function readTokenPage(
  collection: NftCollection,
  cursor: number,
  limit: number,
): Promise<{ tokens: TokenCard[]; nextCursor: number | null; supply: number }> {
  const supply = await readSupply(collection);
  const end = lastTokenId(collection, supply);
  const start = Math.max(cursor, collection.idStart);
  const ids: number[] = [];
  for (let id = start; id <= end && ids.length < limit; id += 1) {
    ids.push(id);
  }

  const uris = await readTokenUris(collection.address, ids);

  const tokens = (
    await mapPool(ids, 6, async (id, index) => {
      const uri = uris[index];
      if (!uri || uri.status !== "success" || !uri.result) return null;
      try {
        const metadata = await readMetadata(uri.result);
        return { id: String(id), ...metadata };
      } catch {
        return { id: String(id), name: `${collection.name} #${id}`, description: "", image: "" };
      }
    })
  ).filter((token): token is TokenCard => token !== null);

  const next = start + ids.length;
  return {
    tokens,
    nextCursor: next <= end ? next : null,
    supply,
  };
}

export async function ownedTokenIds(
  slug: string,
  owner: Address,
): Promise<{ ids: string[]; skipped: boolean }> {
  const collection = findCollection(slug);
  if (!collection) return { ids: [], skipped: false };
  const supply = await readSupply(collection);
  const end = lastTokenId(collection, supply);
  const span = end - collection.idStart + 1;
  if (span > 1_200) return { ids: [], skipped: true };

  const ids: number[] = [];
  for (let id = collection.idStart; id <= end; id += 1) ids.push(id);

  const owners: string[] = [];
  for (let offset = 0; offset < ids.length; offset += 250) {
    const slice = ids.slice(offset, offset + 250);
    const result = await publicClient.multicall({
      allowFailure: true,
      contracts: slice.map((id) => ({
        address: collection.address,
        abi: erc721Abi,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as const,
      })),
    });
    result.forEach((entry, index) => {
      if (entry.status === "success" && entry.result.toLowerCase() === owner.toLowerCase()) {
        owners.push(String(slice[index]));
      }
    });
  }
  return { ids: owners, skipped: false };
}

type Floor = { amount: string; symbol: string } | null;

type CollectionSummary = {
  slug: string;
  name: string;
  symbol: string;
  address: Address;
  hero: boolean;
  blurb: string;
  supply: number | null;
  floor: Floor;
  preview: NftMetadata | null;
  openseaSlug?: string;
};

async function readFloor(slug: string | undefined): Promise<Floor> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key || !slug) return null;
  try {
    const response = await fetch(`https://api.opensea.io/api/v2/collections/${slug}/stats`, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      total?: { floor_price?: number; floor_price_symbol?: string };
    };
    const price = body.total?.floor_price;
    if (typeof price !== "number") return null;
    return {
      amount: price.toLocaleString("en-US", { maximumFractionDigits: 4 }),
      symbol: body.total?.floor_price_symbol ?? "ETH",
    };
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.then((value) => value),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

async function previewToken(collection: NftCollection): Promise<NftMetadata | null> {
  const candidates = [collection.idStart, collection.idStart + 1, collection.idStart + 2];
  const uris = await readTokenUris(collection.address, candidates);
  for (const uri of uris) {
    if (uri.status !== "success" || !uri.result) continue;
    try {
      return await readMetadata(uri.result);
    } catch {
      continue;
    }
  }
  return null;
}

let boardCache: { at: number; value: CollectionSummary[] } | null = null;

export async function collectionBoard(): Promise<CollectionSummary[]> {
  if (boardCache && Date.now() - boardCache.at < 20_000) return boardCache.value;
  const value = await Promise.all(
    COLLECTIONS.map(async (collection) => {
      const [supply, preview, floor] = await Promise.all([
        readSupply(collection).catch(() => null),
        withTimeout(previewToken(collection), 8_000),
        readFloor(collection.openseaSlug),
      ]);
      return {
        slug: collection.slug,
        name: collection.name,
        symbol: collection.symbol,
        address: collection.address,
        hero: collection.hero,
        blurb: collection.blurb,
        supply,
        floor,
        preview,
        openseaSlug: collection.openseaSlug,
      };
    }),
  );
  boardCache = { at: Date.now(), value };
  return value;
}
