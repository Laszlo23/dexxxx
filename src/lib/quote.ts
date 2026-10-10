import { getAddress, zeroAddress, type Address } from "viem";
import { factoryAbi, poolAbi, quoterAbi, routerAbi } from "@/config/abis";
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
  twapAmountOut: bigint | null;
  twapWindow: number | null;
};

const TWAP_WINDOWS = [1_800, 600, 120] as const;

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
  const twap = await readTwap(input.tokenIn, input.tokenOut, input.amountIn, best.fee);
  return {
    fee: best.fee,
    amountOut: best.amountOut,
    amountOutMinimum,
    priceImpactBps: impactBps(input.amountIn, best.amountOut, spotIn, spotOut),
    twapAmountOut: twap?.amountOut ?? null,
    twapWindow: twap?.window ?? null,
  };
}

function averageTick(latest: bigint, past: bigint, window: number): number {
  const delta = latest - past;
  const span = BigInt(window);
  let tick = delta / span;
  if (delta < 0n && delta % span !== 0n) tick -= 1n;
  const asNumber = Number(tick);
  if (!Number.isSafeInteger(asNumber)) throw new Error("TWAP tick is out of range.");
  return asNumber;
}

function amountAtTick(amountIn: bigint, tick: number, zeroForOne: boolean): bigint {
  const scale = 10n ** 18n;
  const ratio = BigInt(Math.round(Math.pow(1.0001, tick) * 1e18));
  if (ratio <= 0n) return 0n;
  return zeroForOne ? (amountIn * ratio) / scale : (amountIn * scale) / ratio;
}

async function readTwap(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: FeeTier,
): Promise<{ amountOut: bigint; window: number } | null> {
  const pool = await publicClient.readContract({
    address: V3_FACTORY,
    abi: factoryAbi,
    functionName: "getPool",
    args: [tokenIn, tokenOut, fee],
  });
  if (getAddress(pool) === zeroAddress) return null;
  const token0 = await publicClient.readContract({
    address: pool,
    abi: poolAbi,
    functionName: "token0",
  });
  const zeroForOne = getAddress(tokenIn) === getAddress(token0);
  for (const window of TWAP_WINDOWS) {
    try {
      const [cumulatives] = await publicClient.readContract({
        address: pool,
        abi: poolAbi,
        functionName: "observe",
        args: [[0, window]],
      });
      const tick = averageTick(cumulatives[0], cumulatives[1], window);
      const amountOut = amountAtTick(amountIn, tick, zeroForOne);
      if (amountOut > 0n) return { amountOut, window };
    } catch {
      continue;
    }
  }
  return null;
}
