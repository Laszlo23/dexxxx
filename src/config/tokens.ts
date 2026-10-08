import type { Address } from "viem";
import { RAREFRIENDS, USDG } from "@/config/contracts";

export const TOKEN_GROUPS = ["Cash", "Desk", "Stocks", "Funds"] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

export type Token = {
  symbol: string;
  name: string;
  address: Address | "native";
  decimals: number;
  group: TokenGroup;
};

export const TOKENS: readonly Token[] = [
  { symbol: "ETH", name: "Ether", address: "native", decimals: 18, group: "Cash" },
  { symbol: "USDG", name: "Global Dollar", address: USDG, decimals: 6, group: "Cash" },
  {
    symbol: "RAREFRIENDS",
    name: "RareFriends",
    address: RAREFRIENDS,
    decimals: 18,
    group: "Desk",
  },
  { symbol: "AAPL", name: "Apple", address: "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9", decimals: 18, group: "Stocks" },
  { symbol: "AMC", name: "AMC", address: "0x05a3d1Cd21d0C88145E82600E62e7E496e0F222B", decimals: 18, group: "Stocks" },
  { symbol: "AMD", name: "AMD", address: "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", decimals: 18, group: "Stocks" },
  { symbol: "AMZN", name: "Amazon", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", decimals: 18, group: "Stocks" },
  { symbol: "COIN", name: "Coinbase", address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", decimals: 18, group: "Stocks" },
  { symbol: "COST", name: "Costco", address: "0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2", decimals: 18, group: "Stocks" },
  { symbol: "CRCL", name: "Circle", address: "0xdF0992E440dD0be65BD8439b609d6D4366bf1CB5", decimals: 18, group: "Stocks" },
  { symbol: "GME", name: "GameStop", address: "0x1b0E319c6A659F002271B69dB8A7df2F911c153E", decimals: 18, group: "Stocks" },
  { symbol: "GOOGL", name: "Alphabet", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", decimals: 18, group: "Stocks" },
  { symbol: "IBM", name: "IBM", address: "0x980dcf6766FA79f5Cf0c4AAdb3ab477ff15a9619", decimals: 18, group: "Stocks" },
  { symbol: "INTC", name: "Intel", address: "0xc72b96e0E48ecd4DC75E1e45396e26300BC39681", decimals: 18, group: "Stocks" },
  { symbol: "JNJ", name: "Johnson & Johnson", address: "0x03DfbBE0AC4E7bCDaFd08eD41A400326B77D8c80", decimals: 18, group: "Stocks" },
  { symbol: "LLY", name: "Eli Lilly", address: "0x8005d266423c7ea827372c9c864491e5786600ea", decimals: 18, group: "Stocks" },
  { symbol: "META", name: "Meta", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", decimals: 18, group: "Stocks" },
  { symbol: "MSFT", name: "Microsoft", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", decimals: 18, group: "Stocks" },
  { symbol: "MSTR", name: "Strategy", address: "0xec262a75e413fAfD0dF80480274532C79D42da09", decimals: 18, group: "Stocks" },
  { symbol: "MU", name: "Micron", address: "0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD", decimals: 18, group: "Stocks" },
  { symbol: "NFLX", name: "Netflix", address: "0xE0444EF8BF4eD74f74FD73686e2ddF4C1c5591E8", decimals: 18, group: "Stocks" },
  { symbol: "NVDA", name: "NVIDIA", address: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec", decimals: 18, group: "Stocks" },
  { symbol: "PLTR", name: "Palantir", address: "0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", decimals: 18, group: "Stocks" },
  { symbol: "RBLX", name: "Roblox", address: "0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8", decimals: 18, group: "Stocks" },
  { symbol: "RDDT", name: "Reddit", address: "0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C", decimals: 18, group: "Stocks" },
  { symbol: "SNAP", name: "Snap", address: "0xF6589F11Bc40b669e584073F428B05562F568733", decimals: 18, group: "Stocks" },
  { symbol: "SPCX", name: "SpaceX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", decimals: 18, group: "Stocks" },
  { symbol: "TSLA", name: "Tesla", address: "0x322f0929c4625ed5bad873c95208d54e1c003b2d", decimals: 18, group: "Stocks" },
  { symbol: "TSM", name: "TSMC", address: "0x58FfE4a942d3885bAa22D7520691F611EF09e7AA", decimals: 18, group: "Stocks" },
  { symbol: "GLD", name: "Gold", address: "0xC9a981FEE1F9DEc688bb123ccDeCc63D0deBFC4e", decimals: 18, group: "Funds" },
  { symbol: "INDA", name: "India ETF", address: "0xACEF2e09adb47aD6aBeBAD9fF06689E60615C2B6", decimals: 18, group: "Funds" },
  { symbol: "QQQ", name: "Nasdaq 100", address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68", decimals: 18, group: "Funds" },
  { symbol: "SPY", name: "S&P 500", address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C", decimals: 18, group: "Funds" },
  { symbol: "USO", name: "US Oil", address: "0xa30FA36Db767ad9eD3f7a60fC79526fB4d56D344", decimals: 18, group: "Funds" },
];

export function findToken(symbol: string): Token | undefined {
  const key = symbol.toLowerCase();
  return TOKENS.find((token) => token.symbol.toLowerCase() === key);
}
