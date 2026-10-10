import { getAddress, type Address } from "viem";

const Q96 = 2n ** 96n;
const Q192 = 2n ** 192n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;
const MIN_SQRT = 4295128739n;
const MAX_SQRT = 1461446703485210103287273052203988822378723970342n;

export function sortTokens(a: Address, b: Address): [Address, Address] {
  const left = getAddress(a);
  const right = getAddress(b);
  return left.toLowerCase() < right.toLowerCase() ? [left, right] : [right, left];
}

export function tickSpacing(fee: number): number {
  switch (fee) {
    case 100:
      return 1;
    case 500:
      return 10;
    case 3000:
      return 60;
    case 10000:
      return 200;
    default:
      throw new Error("Unknown fee tier.");
  }
}

export function fullRangeTicks(fee: number): { tickLower: number; tickUpper: number } {
  const spacing = tickSpacing(fee);
  return {
    tickLower: Math.ceil(MIN_TICK / spacing) * spacing,
    tickUpper: Math.floor(MAX_TICK / spacing) * spacing,
  };
}

function sqrt(value: bigint): bigint {
  if (value < 2n) return value;
  let x0 = value;
  let x1 = (value >> 1n) + 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + value / x1) >> 1n;
  }
  return x0;
}

/** 1.0001^|tick| as a Q192 fixed-point number. */
function powRatio(tick: number): bigint {
  let base = (10001n * Q192) / 10000n;
  let result = Q192;
  let exp = BigInt(Math.abs(tick));
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) / Q192;
    base = (base * base) / Q192;
    exp >>= 1n;
  }
  return result;
}

export function sqrtPriceX96AtTick(tick: number): bigint {
  if (tick < MIN_TICK || tick > MAX_TICK) throw new Error("Tick is outside the v3 range.");
  const ratio = powRatio(tick);
  const price = tick >= 0 ? sqrt(ratio) : Q192 / sqrt(ratio);
  if (price < MIN_SQRT || price > MAX_SQRT) throw new Error("Price is outside the v3 range.");
  return price;
}

export function encodeSqrtPriceX96(token1Raw: bigint, token0Raw: bigint): bigint {
  if (token0Raw <= 0n || token1Raw <= 0n) throw new Error("The price has to be above zero.");
  const price = sqrt((token1Raw << 192n) / token0Raw);
  if (price < MIN_SQRT || price > MAX_SQRT) throw new Error("That price sits outside the v3 range.");
  return price;
}

/** Raw amount of `out` received for 1 whole `in` token at this sqrt price. */
export function rawOutPerWholeIn(
  sqrtPriceX96: bigint,
  tokenIn: Address,
  tokenOut: Address,
  token0: Address,
  decimalsIn: number,
): bigint {
  const priceX192 = sqrtPriceX96 * sqrtPriceX96;
  const oneIn = 10n ** BigInt(decimalsIn);
  const inIsToken0 = getAddress(tokenIn) === getAddress(token0);
  const outIsToken1 = getAddress(tokenOut) !== getAddress(token0);
  if (inIsToken0 !== outIsToken1) throw new Error("The pair does not match this pool.");
  if (inIsToken0) return (oneIn * priceX192) / Q192;
  return (oneIn * Q192) / priceX192;
}

export function amountsForDeposit(input: {
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  depositIsToken0: boolean;
  deposit: bigint;
}): { amount0: bigint; amount1: bigint } {
  const sqrtA = sqrtPriceX96AtTick(input.tickLower);
  const sqrtB = sqrtPriceX96AtTick(input.tickUpper);
  const sqrtP = input.sqrtPriceX96;
  if (sqrtP <= sqrtA || sqrtP >= sqrtB) throw new Error("The price is outside this range.");
  if (input.deposit <= 0n) return { amount0: 0n, amount1: 0n };

  const liquidity = input.depositIsToken0
    ? (input.deposit * sqrtP * sqrtB) / ((sqrtB - sqrtP) * Q96)
    : (input.deposit * Q96) / (sqrtP - sqrtA);

  return {
    amount0: (liquidity * (sqrtB - sqrtP) * Q96) / (sqrtP * sqrtB),
    amount1: (liquidity * (sqrtP - sqrtA)) / Q96,
  };
}
