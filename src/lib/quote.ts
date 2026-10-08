import { getAddress, zeroAddress, type Address } from "viem";
import { factoryAbi, quoterAbi, routerAbi } from "@/config/abis";
import {
  DEFAULT_SLIPPAGE_BPS,
  FEE_TIERS,
  QUOTER_V2,
  SWAP_ROUTER_02,
  V3_FACTORY,
  WETH,
  type FeeTier,
} from "@/config/contracts";
import { publicClient } from "@/lib/public-client";

let routerCheck: Promise<void> | null = null;

export function verifyRouter(): Promise<void> {
  routerCheck ??= (async () => {
    const [weth, factory] = await Promise.all([
      publicClient.readContract({
        address: SWAP_ROUTER_02,
        abi: routerAbi,
        functionName: "WETH9",
      }),
      publicClient.readContract({
        address: SWAP_ROUTER_02,
        abi: routerAbi,
        functionName: "factory",
      }),
    ]);
    if (getAddress(weth) !== getAddress(WETH)) {
      throw new Error("SwapRouter02 WETH9 does not match Robinhood WETH");
    }
    if (getAddress(factory) !== getAddress(V3_FACTORY)) {
      throw new Error("SwapRouter02 factory does not match the v3 factory");
    }
  })();
  return routerCheck;
}

export type Quote = {
  fee: FeeTier;
  amountOut: bigint;
  amountOutMinimum: bigint;
  priceImpactBps: number;
};

function impactBps(
  amountIn: bigint,
  amountOut: bigint,
  spotIn: bigint,
  spotOut: bigint,
): number {
  if (spotOut === 0n || amountIn === 0n || amountOut === 0n) return 0;
  const execution = amountOut * spotIn;
  const spot = amountIn * spotOut;
  if (spot === 0n || execution >= spot) return 0;
  return Number(((spot - execution) * 10_000n) / spot);
}

async function quoteTier(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: FeeTier,
): Promise<bigint | null> {
  const pool = await publicClient.readContract({
    address: V3_FACTORY,
    abi: factoryAbi,
    functionName: "getPool",
    args: [tokenIn, tokenOut, fee],
  });
  if (getAddress(pool) === zeroAddress) return null;
  try {
    const result = await publicClient.readContract({
      address: QUOTER_V2,
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
    return result[0] > 0n ? result[0] : null;
  } catch {
    return null;
  }
}

export async function quoteBest(input: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  slippageBps?: number;
}): Promise<Quote | null> {
  await verifyRouter();
  const slippage = input.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const quotes = await Promise.all(
    FEE_TIERS.map(async (fee) => {
      const amountOut = await quoteTier(input.tokenIn, input.tokenOut, input.amountIn, fee);
      return amountOut === null ? null : { fee, amountOut };
    }),
  );
  const best = quotes.reduce<(typeof quotes)[number]>((winner, quote) => {
    if (!quote) return winner;
    if (!winner || quote.amountOut > winner.amountOut) return quote;
    return winner;
  }, null);
  if (!best) return null;

  const spotIn = input.amountIn > 10_000n ? input.amountIn / 100n : input.amountIn;
  const spotOut =
    spotIn === input.amountIn
      ? best.amountOut
      : ((await quoteTier(input.tokenIn, input.tokenOut, spotIn, best.fee)) ?? best.amountOut);

  const amountOutMinimum = (best.amountOut * BigInt(10_000 - slippage)) / 10_000n;
  return {
    fee: best.fee,
    amountOut: best.amountOut,
    amountOutMinimum,
    priceImpactBps: impactBps(input.amountIn, best.amountOut, spotIn, spotOut),
  };
}
