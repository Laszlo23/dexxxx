import type { Address } from "viem";

export type OrderSide = "listing" | "offer";

export type Listing = {
  hash: string;
  protocolAddress: Address;
  side: OrderSide;
  tokenId: string;
  nft: Address | null;
  price: string;
  symbol: string;
  rawAmount: string;
  paymentToken: Address | null;
  paymentAmount: string;
  spender: Address | null;
};

export function betterOrder(left?: Listing, right?: Listing): Listing | undefined {
  if (!left) return right;
  if (!right) return left;
  return BigInt(left.rawAmount) >= BigInt(right.rawAmount) ? left : right;
}
