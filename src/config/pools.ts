import type { Address } from "viem";
import { RAREFRIENDS, USDG, WETH } from "@/config/contracts";

export const POSITION_MANAGER: Address = "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3";

export const POOL_FEES = [3000, 10000] as const;
export type PoolFee = (typeof POOL_FEES)[number];

export type QuoteSide = "ETH" | "USDG";

export type NftToken = {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  note: string;
};

export const NFT_TOKENS: readonly NftToken[] = [
  {
    symbol: "RAREFRIENDS",
    name: "Rare Friends",
    address: RAREFRIENDS,
    decimals: 18,
    note: "The token Genesis friends spend. No v3 pool is open yet.",
  },
  {
    symbol: "STONKBROKER",
    name: "StonkBroker",
    address: "0xe934e36A439C94017B64a3FecE66AF12099aBF50",
    decimals: 18,
    note: "The StonkBrokers token. Pools against ETH and USDG are already live.",
  },
  {
    symbol: "CCFF00",
    name: "CCFF00",
    address: "0x6a4d37EB900E74107774051Cd3e5EeE68f6e9e89",
    decimals: 18,
    note: "The CCFF00 membership token. An ETH pool is live. USDG is still closed.",
  },
];

export function quoteAsset(side: QuoteSide): {
  symbol: QuoteSide;
  address: Address | "native";
  poolToken: Address;
  decimals: number;
} {
  switch (side) {
    case "ETH":
      return { symbol: "ETH", address: "native", poolToken: WETH, decimals: 18 };
    case "USDG":
      return { symbol: "USDG", address: USDG, poolToken: USDG, decimals: 6 };
    default: {
      const unknown: never = side;
      return unknown;
    }
  }
}

export const positionManagerAbi = [
  {
    type: "function",
    name: "createAndInitializePoolIfNecessary",
    stateMutability: "payable",
    inputs: [
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "token0", type: "address" },
          { name: "token1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "amount0Desired", type: "uint256" },
          { name: "amount1Desired", type: "uint256" },
          { name: "amount0Min", type: "uint256" },
          { name: "amount1Min", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "liquidity", type: "uint128" },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
  },
] as const;
