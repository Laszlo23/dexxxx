export type NftMetadata = {
  name: string;
  description: string;
  image: string;
};

function rewriteUri(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.slice("ipfs://".length)}`;
  }
  return uri;
}

function asMetadata(value: unknown): NftMetadata {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawImage =
    (typeof record.image === "string" && record.image) ||
    (typeof record.image_data === "string" && record.image_data) ||
    "";
  const image = rawImage ? rewriteUri(rawImage) : "";
  return {
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : "",
    image,
  };
}

export async function readMetadata(uri: string): Promise<NftMetadata> {
  if (uri.startsWith("data:application/json")) {
    const comma = uri.indexOf(",");
    const header = uri.slice(0, comma);
    const payload = uri.slice(comma + 1);
    const text = header.includes(";base64")
      ? Buffer.from(payload, "base64").toString("utf8")
      : decodeURIComponent(payload);
    return asMetadata(JSON.parse(text) as unknown);
  }

  const response = await fetch(rewriteUri(uri), {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Metadata request failed (${response.status})`);
  }
  return asMetadata((await response.json()) as unknown);
}

export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
