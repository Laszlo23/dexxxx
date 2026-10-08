import type { Address } from "viem";

export const WETH: Address = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const USDG: Address = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
export const RAREFRIENDS: Address = "0x0779369854d3ecdea927206718ffd7730c67b71f";

export const SWAP_ROUTER_02: Address = "0xcaf681a66d020601342297493863e78c959e5cb2";
export const QUOTER_V2: Address = "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7";
export const V3_FACTORY: Address = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa";

export const V4_POOL_MANAGER: Address = "0x8366a39cc670b4001a1121b8f6a443a643e40951";
export const UNIVERSAL_ROUTER: Address = "0x8876789976decbfcbbbe364623c63652db8c0904";

export const FEE_TIERS = [100, 500, 3000, 10000] as const;
export type FeeTier = (typeof FEE_TIERS)[number];

/** SwapRouter02 flag: deliver the swap output to the router, then unwrap. */
export const ADDRESS_THIS: Address = "0x0000000000000000000000000000000000000002";

export const DEFAULT_SLIPPAGE_BPS = 50;
