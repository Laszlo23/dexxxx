import {
  encodeFunctionData,
  isAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import type { Listing } from "@/lib/listing";
import { mapPool } from "@/lib/metadata";
import { publicClient } from "@/lib/public-client";

const CONDUIT_CONTROLLER = "0x00000000F9490004C11Cef243f5400493c00Ad63" as const;

const conduitAbi = [
  {
    type: "function",
    name: "getConduit",
    stateMutability: "view",
    inputs: [{ name: "conduitKey", type: "bytes32" }],
    outputs: [
      { name: "conduit", type: "address" },
      { name: "exists", type: "bool" },
    ],
  },
] as const;

const fulfillBasicAbi = [
  {
    type: "function",
    name: "fulfillBasicOrder_efficient_6GL6yc",
    stateMutability: "payable",
    inputs: [
      {
        name: "parameters",
        type: "tuple",
        components: [
          { name: "considerationToken", type: "address" },
          { name: "considerationIdentifier", type: "uint256" },
          { name: "considerationAmount", type: "uint256" },
          { name: "offerer", type: "address" },
          { name: "zone", type: "address" },
          { name: "offerToken", type: "address" },
          { name: "offerIdentifier", type: "uint256" },
          { name: "offerAmount", type: "uint256" },
          { name: "basicOrderType", type: "uint8" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "zoneHash", type: "bytes32" },
          { name: "salt", type: "uint256" },
          { name: "offererConduitKey", type: "bytes32" },
          { name: "fulfillerConduitKey", type: "bytes32" },
          { name: "totalOriginalAdditionalRecipients", type: "uint256" },
          {
            name: "additionalRecipients",
            type: "tuple[]",
            components: [
              { name: "amount", type: "uint256" },
              { name: "recipient", type: "address" },
            ],
          },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "fulfilled", type: "bool" }],
  },
] as const;

type Consideration = {
  itemType?: number;
  token?: string;
  startAmount?: string;
  endAmount?: string;
  identifierOrCriteria?: string;
  recipient?: string;
};

type Money = { currency?: string; decimals?: number; value?: string };

type RawListing = {
  order_hash?: string;
  protocol_address?: string;
  asset?: { identifier?: string | null; contract?: string };
  criteria?: { contract?: { address?: string }; encoded_token_ids?: string };
  protocol_data?: {
    parameters?: {
      conduitKey?: Hex;
      offer?: Consideration[];
      consideration?: Consideration[];
    };
  };
  price?: { current?: Money } & Money;
};

type BasicParameters = {
  considerationToken: Address;
  considerationIdentifier: string;
  considerationAmount: string;
  offerer: Address;
  zone: Address;
  offerToken: Address;
  offerIdentifier: string;
  offerAmount: string;
  basicOrderType: number;
  startTime: string;
  endTime: string;
  zoneHash: Hex;
  salt: string;
  offererConduitKey: Hex;
  fulfillerConduitKey: Hex;
  totalOriginalAdditionalRecipients: string;
  additionalRecipients: { amount: string; recipient: Address }[];
  signature: Hex;
};

type OfferItem = {
  itemType: number;
  token: Address;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
};

type AdvancedInput = {
  advancedOrder: {
    parameters: {
      offerer: Address;
      zone: Address;
      offer: OfferItem[];
      consideration: (OfferItem & { recipient: Address })[];
      orderType: number;
      startTime: string;
      endTime: string;
      zoneHash: Hex;
      salt: string;
      conduitKey: Hex;
      totalOriginalConsiderationItems: string;
    };
    numerator: number | string;
    denominator: number | string;
    signature: Hex;
    extraData: Hex;
  };
  criteriaResolvers: {
    orderIndex: string;
    side: number;
    index: string;
    identifier: string;
    criteriaProof?: Hex[];
  }[];
  fulfillerConduitKey: Hex;
  recipient: Address;
};

type FulfillmentTransaction = {
  to?: string;
  value?: string | number;
  input_data?: { parameters?: BasicParameters; advancedOrder?: AdvancedInput["advancedOrder"] } | AdvancedInput | string;
  calldata_suffix?: string;
};

const fulfillAdvancedAbi = [
  {
    type: "function",
    name: "fulfillAdvancedOrder",
    stateMutability: "payable",
    inputs: [
      {
        name: "advancedOrder",
        type: "tuple",
        components: [
          {
            name: "parameters",
            type: "tuple",
            components: [
              { name: "offerer", type: "address" },
              { name: "zone", type: "address" },
              {
                name: "offer",
                type: "tuple[]",
                components: [
                  { name: "itemType", type: "uint8" },
                  { name: "token", type: "address" },
                  { name: "identifierOrCriteria", type: "uint256" },
                  { name: "startAmount", type: "uint256" },
                  { name: "endAmount", type: "uint256" },
                ],
              },
              {
                name: "consideration",
                type: "tuple[]",
                components: [
                  { name: "itemType", type: "uint8" },
                  { name: "token", type: "address" },
                  { name: "identifierOrCriteria", type: "uint256" },
                  { name: "startAmount", type: "uint256" },
                  { name: "endAmount", type: "uint256" },
                  { name: "recipient", type: "address" },
                ],
              },
              { name: "orderType", type: "uint8" },
              { name: "startTime", type: "uint256" },
              { name: "endTime", type: "uint256" },
              { name: "zoneHash", type: "bytes32" },
              { name: "salt", type: "uint256" },
              { name: "conduitKey", type: "bytes32" },
              { name: "totalOriginalConsiderationItems", type: "uint256" },
            ],
          },
          { name: "numerator", type: "uint120" },
          { name: "denominator", type: "uint120" },
          { name: "signature", type: "bytes" },
          { name: "extraData", type: "bytes" },
        ],
      },
      {
        name: "criteriaResolvers",
        type: "tuple[]",
        components: [
          { name: "orderIndex", type: "uint256" },
          { name: "side", type: "uint8" },
          { name: "index", type: "uint256" },
          { name: "identifier", type: "uint256" },
          { name: "criteriaProof", type: "bytes32[]" },
        ],
      },
      { name: "fulfillerConduitKey", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "fulfilled", type: "bool" }],
  },
] as const;

function authHeaders(): HeadersInit | null {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return null;
  return { "x-api-key": key, accept: "application/json" };
}

function moneyOf(price: RawListing["price"]): Money | null {
  if (!price) return null;
  if (price.current?.value) return price.current;
  if (price.value) return price;
  return null;
}

function displayPrice(value: string, decimals: number): string {
  const numeric = Number(value) / 10 ** decimals;
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("en-US", {
    maximumFractionDigits: numeric >= 1 ? 2 : 6,
  });
}

const conduits = new Map<string, Promise<Address | null>>();

async function conduitFor(key: Hex, seaport: Address): Promise<Address | null> {
  if (key === zeroHash) return seaport;
  const cached = conduits.get(key);
  if (cached) return cached;
  const pending = publicClient
    .readContract({
      address: CONDUIT_CONTROLLER,
      abi: conduitAbi,
      functionName: "getConduit",
      args: [key],
    })
    .then(([conduit, exists]) => (exists ? conduit : null))
    .catch(() => null);
  conduits.set(key, pending);
  return pending;
}

async function toListing(order: RawListing): Promise<Listing | null> {
  const hash = order.order_hash;
  const protocol = order.protocol_address;
  const tokenId = order.asset?.identifier;
  const current = moneyOf(order.price);
  if (!hash || !protocol || !isAddress(protocol) || !tokenId || !current?.value) return null;
  const consideration = order.protocol_data?.parameters?.consideration ?? [];
  const erc20 = consideration.find(
    (item) => item.itemType === 1 && item.token && isAddress(item.token),
  );
  const paymentToken = erc20?.token && isAddress(erc20.token) ? erc20.token : null;
  const paymentAmount = paymentToken
    ? consideration
        .filter((item) => item.token?.toLowerCase() === paymentToken.toLowerCase())
        .reduce((total, item) => total + BigInt(item.startAmount ?? "0"), 0n)
        .toString()
    : current.value;
  const conduitKey = order.protocol_data?.parameters?.conduitKey ?? zeroHash;
  const spender = paymentToken ? await conduitFor(conduitKey, protocol) : null;
  return {
    hash,
    protocolAddress: protocol,
    side: "listing",
    tokenId,
    nft: null,
    price: displayPrice(current.value, current.decimals ?? 18),
    symbol: current.currency ?? "ETH",
    rawAmount: current.value,
    paymentToken,
    paymentAmount,
    spender,
  };
}

async function toOffer(order: RawListing): Promise<Listing | null> {
  const hash = order.order_hash;
  const protocol = order.protocol_address;
  const current = moneyOf(order.price);
  const nftSource = order.criteria?.contract?.address ?? order.asset?.contract;
  if (!hash || !protocol || !isAddress(protocol) || !nftSource || !isAddress(nftSource) || !current?.value) {
    return null;
  }
  const conduitKey = order.protocol_data?.parameters?.conduitKey ?? zeroHash;
  return {
    hash,
    protocolAddress: protocol,
    side: "offer",
    tokenId: order.asset?.identifier ?? "*",
    nft: nftSource,
    price: displayPrice(current.value, current.decimals ?? 18),
    symbol: current.currency ?? "ETH",
    rawAmount: current.value,
    paymentToken: null,
    paymentAmount: "0",
    spender: await conduitFor(conduitKey, protocol),
  };
}

const listingCache = new Map<string, { at: number; value: Record<string, Listing> }>();
const askCache = new Map<string, { at: number; value: Listing[] }>();
const bidCache = new Map<string, { at: number; value: Listing[] }>();
const itemOfferCache = new Map<string, { at: number; value: Record<string, Listing> }>();

export async function listingsFor(slug: string, tokenIds: string[]): Promise<Record<string, Listing>> {
  const headers = authHeaders();
  if (!headers || tokenIds.length === 0) return {};
  const ids = [...new Set(tokenIds)].slice(0, 24);
  const cacheKey = `${slug}:${ids.join(",")}`;
  const cached = listingCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 20_000) return cached.value;
  const rows = await mapPool(ids, 4, async (id) => {
    try {
      const response = await fetch(
        `https://api.opensea.io/api/v2/listings/collection/${encodeURIComponent(slug)}/nfts/${id}/best`,
        { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
      );
      if (!response.ok) return null;
      return toListing((await response.json()) as RawListing);
    } catch {
      return null;
    }
  });
  const found: Record<string, Listing> = {};
  for (const row of rows) {
    if (row) found[row.tokenId] = row;
  }
  listingCache.set(cacheKey, { at: Date.now(), value: found });
  return found;
}

export async function bestAsks(slug: string, limit: number): Promise<Listing[]> {
  const headers = authHeaders();
  if (!headers) return [];
  const cached = askCache.get(slug);
  if (cached && Date.now() - cached.at < 20_000) return cached.value.slice(0, limit);
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v2/listings/collection/${encodeURIComponent(slug)}/best?limit=${limit}`,
      { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { listings?: RawListing[] };
    const asks: Listing[] = [];
    const seen = new Set<string>();
    for (const order of body.listings ?? []) {
      const listing = await toListing(order);
      if (!listing || seen.has(listing.tokenId)) continue;
      seen.add(listing.tokenId);
      asks.push(listing);
    }
    askCache.set(slug, { at: Date.now(), value: asks });
    return asks;
  } catch {
    return [];
  }
}

export async function bestBids(slug: string, limit: number): Promise<Listing[]> {
  const headers = authHeaders();
  if (!headers) return [];
  const cached = bidCache.get(slug);
  if (cached && Date.now() - cached.at < 20_000) return cached.value.slice(0, limit);
  try {
    const response = await fetch(
      `https://api.opensea.io/api/v2/offers/collection/${encodeURIComponent(slug)}?limit=${limit}`,
      { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { offers?: RawListing[] };
    const bids: Listing[] = [];
    for (const order of body.offers ?? []) {
      const bid = await toOffer(order);
      if (bid) bids.push(bid);
    }
    bids.sort((left, right) => (BigInt(left.rawAmount) > BigInt(right.rawAmount) ? -1 : 1));
    bidCache.set(slug, { at: Date.now(), value: bids });
    return bids.slice(0, limit);
  } catch {
    return [];
  }
}

export async function bestItemOffers(slug: string, tokenIds: string[]): Promise<Record<string, Listing>> {
  const headers = authHeaders();
  if (!headers || tokenIds.length === 0) return {};
  const ids = [...new Set(tokenIds)].slice(0, 12);
  const cacheKey = `${slug}:${ids.join(",")}`;
  const cached = itemOfferCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 20_000) return cached.value;
  const rows = await mapPool(ids, 4, async (id) => {
    try {
      const response = await fetch(
        `https://api.opensea.io/api/v2/offers/collection/${encodeURIComponent(slug)}/nfts/${id}/best`,
        { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
      );
      if (!response.ok) return null;
      const bid = await toOffer((await response.json()) as RawListing);
      return bid ? { id, bid } : null;
    } catch {
      return null;
    }
  });
  const found: Record<string, Listing> = {};
  for (const row of rows) {
    if (row) found[row.id] = row.bid;
  }
  itemOfferCache.set(cacheKey, { at: Date.now(), value: found });
  return found;
}

function appendSuffix(data: Hex, suffix: string | undefined): Hex {
  if (!suffix || suffix === "0x") return data;
  return `${data}${suffix.replace(/^0x/, "")}` as Hex;
}

function encodeAdvanced(input: AdvancedInput): Hex {
  const order = input.advancedOrder;
  const parameters = order.parameters;
  return encodeFunctionData({
    abi: fulfillAdvancedAbi,
    functionName: "fulfillAdvancedOrder",
    args: [
      {
        parameters: {
          offerer: parameters.offerer,
          zone: parameters.zone,
          offer: parameters.offer.map((item) => ({
            itemType: item.itemType,
            token: item.token,
            identifierOrCriteria: BigInt(item.identifierOrCriteria),
            startAmount: BigInt(item.startAmount),
            endAmount: BigInt(item.endAmount),
          })),
          consideration: parameters.consideration.map((item) => ({
            itemType: item.itemType,
            token: item.token,
            identifierOrCriteria: BigInt(item.identifierOrCriteria),
            startAmount: BigInt(item.startAmount),
            endAmount: BigInt(item.endAmount),
            recipient: item.recipient,
          })),
          orderType: parameters.orderType,
          startTime: BigInt(parameters.startTime),
          endTime: BigInt(parameters.endTime),
          zoneHash: parameters.zoneHash,
          salt: BigInt(parameters.salt),
          conduitKey: parameters.conduitKey,
          totalOriginalConsiderationItems: BigInt(parameters.totalOriginalConsiderationItems),
        },
        numerator: BigInt(order.numerator),
        denominator: BigInt(order.denominator),
        signature: order.signature,
        extraData: order.extraData,
      },
      input.criteriaResolvers.map((resolver) => ({
        orderIndex: BigInt(resolver.orderIndex),
        side: resolver.side,
        index: BigInt(resolver.index),
        identifier: BigInt(resolver.identifier),
        criteriaProof: resolver.criteriaProof ?? [],
      })),
      input.fulfillerConduitKey,
      input.recipient,
    ],
  });
}

function isAdvancedInput(input: object): input is AdvancedInput {
  return "advancedOrder" in input && input.advancedOrder !== undefined;
}

function encodeFulfillment(tx: FulfillmentTransaction): Hex | null {
  const input = tx.input_data;
  if (typeof input === "string") {
    if (!input.startsWith("0x")) return null;
    return appendSuffix(input as Hex, tx.calldata_suffix);
  }
  if (!input) return null;
  if (isAdvancedInput(input)) {
    if (!input.advancedOrder.signature.startsWith("0x")) return null;
    return appendSuffix(encodeAdvanced(input), tx.calldata_suffix);
  }
  const parameters = "parameters" in input ? input.parameters : undefined;
  if (!parameters?.signature?.startsWith("0x")) return null;
  const data = encodeFunctionData({
    abi: fulfillBasicAbi,
    functionName: "fulfillBasicOrder_efficient_6GL6yc",
    args: [
      {
        considerationToken: parameters.considerationToken,
        considerationIdentifier: BigInt(parameters.considerationIdentifier),
        considerationAmount: BigInt(parameters.considerationAmount),
        offerer: parameters.offerer,
        zone: parameters.zone,
        offerToken: parameters.offerToken,
        offerIdentifier: BigInt(parameters.offerIdentifier),
        offerAmount: BigInt(parameters.offerAmount),
        basicOrderType: parameters.basicOrderType,
        startTime: BigInt(parameters.startTime),
        endTime: BigInt(parameters.endTime),
        zoneHash: parameters.zoneHash,
        salt: BigInt(parameters.salt),
        offererConduitKey: parameters.offererConduitKey,
        fulfillerConduitKey: parameters.fulfillerConduitKey,
        totalOriginalAdditionalRecipients: BigInt(parameters.totalOriginalAdditionalRecipients),
        additionalRecipients: parameters.additionalRecipients.map((recipient) => ({
          amount: BigInt(recipient.amount),
          recipient: recipient.recipient,
        })),
        signature: parameters.signature,
      },
    ],
  });
  return appendSuffix(data, tx.calldata_suffix);
}

export type Purchase = {
  to: Address;
  data: Hex;
  value: string;
  approval: { token: Address; spender: Address; amount: string } | null;
};

export async function fulfillmentData(input: {
  hash: string;
  protocolAddress: Address;
  fulfiller: Address;
}): Promise<Purchase | null> {
  const headers = authHeaders();
  if (!headers) return null;
  const response = await fetch("https://api.opensea.io/api/v2/listings/fulfillment_data", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      listing: {
        hash: input.hash,
        chain: "robinhood",
        protocol_address: input.protocolAddress,
      },
      fulfiller: { address: input.fulfiller },
    }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    fulfillment_data?: { transaction?: FulfillmentTransaction };
  };
  const tx = body.fulfillment_data?.transaction;
  if (!tx?.to || !isAddress(tx.to)) return null;
  const data = encodeFulfillment(tx);
  if (!data) return null;
  const parameters =
    typeof tx.input_data === "object" && tx.input_data && "parameters" in tx.input_data
      ? tx.input_data.parameters
      : undefined;
  const erc20 = parameters && parameters.basicOrderType >= 8 && parameters.considerationToken !== zeroAddress;
  const approval = erc20
    ? {
        token: parameters.considerationToken,
        spender:
          (await conduitFor(parameters.fulfillerConduitKey, tx.to)) ?? tx.to,
        amount: (
          BigInt(parameters.considerationAmount) +
          parameters.additionalRecipients.reduce((total, recipient) => total + BigInt(recipient.amount), 0n)
        ).toString(),
      }
    : null;
  return {
    to: tx.to,
    data,
    value: String(tx.value ?? "0"),
    approval,
  };
}

export type BuiltOrder = { ok: true; purchase: Purchase } | { ok: false; error: string };

async function failureMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { errors?: string[] };
    return body.errors?.[0] ?? fallback;
  } catch {
    return fallback;
  }
}

function purchaseFrom(tx: FulfillmentTransaction): Purchase | null {
  if (!tx.to || !isAddress(tx.to)) return null;
  const data = encodeFulfillment(tx);
  if (!data) return null;
  return { to: tx.to, data, value: String(tx.value ?? "0"), approval: null };
}

export async function offerFulfillmentData(input: {
  hash: string;
  protocolAddress: Address;
  fulfiller: Address;
  nft: Address;
  tokenId: string;
}): Promise<BuiltOrder> {
  const headers = authHeaders();
  if (!headers) return { ok: false, error: "OpenSea is not configured on this server yet." };
  const response = await fetch("https://api.opensea.io/api/v2/offers/fulfillment_data", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      offer: {
        hash: input.hash,
        chain: "robinhood",
        protocol_address: input.protocolAddress,
      },
      fulfiller: { address: input.fulfiller },
      consideration: {
        asset_contract_address: input.nft,
        token_id: input.tokenId,
      },
    }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) {
    return { ok: false, error: await failureMessage(response, "OpenSea could not build this sale.") };
  }
  const body = (await response.json()) as {
    fulfillment_data?: { transaction?: FulfillmentTransaction };
  };
  const tx = body.fulfillment_data?.transaction;
  if (!tx) return { ok: false, error: "OpenSea did not return a sale transaction." };
  const purchase = purchaseFrom(tx);
  if (!purchase) return { ok: false, error: "OpenSea returned a sale this wallet cannot sign." };
  return { ok: true, purchase };
}
