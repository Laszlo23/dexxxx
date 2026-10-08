import { erc20Abi, isAddress, zeroHash, type Address } from "viem";
import { robinhood } from "@/config/chain";
import { COLLECTIONS } from "@/data/collections";
import { TOKENS } from "@/config/tokens";
import { formatDisplay } from "@/lib/format";
import { publicClient } from "@/lib/public-client";

const CANONICAL_REGISTRY = "0x000000006551c19487814612e58FE06813775758" as const;

const registryAbi = [
  {
    type: "function",
    name: "account",
    stateMutability: "view",
    inputs: [
      { name: "implementation", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "chainId", type: "uint256" },
      { name: "tokenContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const ethBalanceAbi = [
  {
    type: "function",
    name: "getEthBalance",
    stateMutability: "view",
    inputs: [{ name: "addr", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

type BoundWallet = {
  registry: Address;
  implementation: Address;
  /** Show the account even when it is empty. Derivation was checked on chain. */
  always: boolean;
};

const BOUND: Record<string, BoundWallet> = {
  stonkbrokers: {
    registry: "0x28c154cbdeaecbf5f72b6ae48535ab9a431a4161",
    implementation: "0xE946075125843aAdb5e40e59f513d929AF507C4B",
    always: true,
  },
  "rh-machines": {
    registry: CANONICAL_REGISTRY,
    implementation: "0xaaf7bb9d1a9e51eb87fd86a2df818e72bf5e3baa",
    always: true,
  },
  ccff00: {
    registry: CANONICAL_REGISTRY,
    implementation: "0x03da8c9df253a4401b08629a6f50e4c4e8e248cc",
    always: false,
  },
};

const TRACKED = [
  ...TOKENS,
  {
    symbol: "STONKBROKER",
    name: "StonkBroker",
    address: "0xe934e36a439c94017b64a3fece66af12099abf50" as Address,
    decimals: 18,
  },
  {
    symbol: "CCFF00",
    name: "CCFF00",
    address: "0x6a4d37EB900E74107774051Cd3e5EeE68f6e9e89" as Address,
    decimals: 18,
  },
] as const;

export type Holding = {
  symbol: string;
  name: string;
  display: string;
};

export type NftWallet = {
  address: Address;
  holdings: Holding[];
};

export type BagNft = {
  id: string;
  name: string;
  image: string;
  collection: string;
  contract: Address;
  link: string;
  wallet: NftWallet | null;
};

export type Portfolio = {
  owner: Address;
  holdings: Holding[];
  nfts: BagNft[];
  wallets: number;
};

type RawNft = {
  identifier?: string;
  name?: string;
  image_url?: string;
  display_image_url?: string;
  collection?: string;
  contract?: string;
  opensea_url?: string;
};

const cache = new Map<string, { at: number; value: Portfolio }>();

function collectionFor(address: string) {
  return COLLECTIONS.find((item) => item.address.toLowerCase() === address.toLowerCase());
}

function isErc20(
  token: (typeof TRACKED)[number],
): token is (typeof TRACKED)[number] & { address: Address } {
  return token.address !== "native";
}

async function readHoldings(addresses: readonly Address[]): Promise<Holding[][]> {
  if (addresses.length === 0) return [];
  const erc20s = TRACKED.filter(isErc20);
  const multicall = robinhood.contracts.multicall3.address;
  const contracts = addresses.flatMap((owner) => [
    {
      address: multicall,
      abi: ethBalanceAbi,
      functionName: "getEthBalance" as const,
      args: [owner] as const,
    },
    ...erc20s.map((token) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [owner] as const,
    })),
  ]);
  const results = await publicClient.multicall({ contracts, allowFailure: true });
  const width = 1 + erc20s.length;
  return addresses.map((_, index) => {
    const slice = results.slice(index * width, (index + 1) * width);
    const holdings: Holding[] = [];
    const eth = slice[0];
    if (eth?.status === "success" && typeof eth.result === "bigint" && eth.result > 0n) {
      holdings.push({ symbol: "ETH", name: "Ether", display: formatDisplay(eth.result, 18) });
    }
    erc20s.forEach((token, tokenIndex) => {
      const row = slice[tokenIndex + 1];
      if (row?.status === "success" && typeof row.result === "bigint" && row.result > 0n) {
        holdings.push({
          symbol: token.symbol,
          name: token.name,
          display: formatDisplay(row.result, token.decimals),
        });
      }
    });
    return holdings;
  });
}

async function accountNfts(owner: Address): Promise<RawNft[]> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return [];
  const found: RawNft[] = [];
  let next: string | null = null;
  for (let page = 0; page < 2; page += 1) {
    const search = new URLSearchParams({ limit: "50" });
    if (next) search.set("next", next);
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/robinhood/account/${owner}/nfts?${search}`,
      { headers: { "x-api-key": key, accept: "application/json" }, signal: AbortSignal.timeout(12_000), cache: "no-store" },
    );
    if (!response.ok) break;
    const body = (await response.json()) as { nfts?: RawNft[]; next?: string | null };
    found.push(...(body.nfts ?? []));
    next = body.next ?? null;
    if (!next) break;
  }
  return found;
}

async function boundAccounts(
  rows: { contract: Address; id: string; config: BoundWallet }[],
): Promise<(Address | null)[]> {
  if (rows.length === 0) return [];
  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: rows.map((row) => ({
      address: row.config.registry,
      abi: registryAbi,
      functionName: "account" as const,
      args: [
        row.config.implementation,
        zeroHash,
        BigInt(robinhood.id),
        row.contract,
        BigInt(row.id),
      ] as const,
    })),
  });
  return results.map((entry) => (entry.status === "success" ? entry.result : null));
}

export async function readPortfolio(owner: Address): Promise<Portfolio> {
  const key = owner.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 20_000) return cached.value;

  const [ownerHoldings, rawNfts] = await Promise.all([
    readHoldings([owner]).then((rows) => rows[0] ?? []),
    accountNfts(owner),
  ]);

  const boundRows = rawNfts.flatMap((nft) => {
    if (!nft.contract || !isAddress(nft.contract) || !nft.identifier) return [];
    const collection = collectionFor(nft.contract);
    const config = collection ? BOUND[collection.slug] : undefined;
    if (!config) return [];
    return [{ contract: nft.contract, id: nft.identifier, config }];
  });
  const accounts = await boundAccounts(boundRows);
  const inner = await readHoldings(accounts.filter((account): account is Address => account !== null));
  const innerByAccount = new Map<string, Holding[]>();
  accounts.forEach((account) => {
    if (!account) return;
    const holdings = inner[innerByAccount.size] ?? [];
    innerByAccount.set(account.toLowerCase(), holdings);
  });

  let cursor = 0;
  const nfts: BagNft[] = rawNfts.flatMap((nft) => {
    if (!nft.contract || !isAddress(nft.contract) || !nft.identifier) return [];
    const collection = collectionFor(nft.contract);
    const config = collection ? BOUND[collection.slug] : undefined;
    let wallet: NftWallet | null = null;
    if (config) {
      const account = accounts[cursor] ?? null;
      cursor += 1;
      const holdings = account ? (innerByAccount.get(account.toLowerCase()) ?? []) : [];
      if (account && (config.always || holdings.length > 0)) {
        wallet = { address: account, holdings };
      }
    }
    return [
      {
        id: nft.identifier,
        name: nft.name || `${collection?.name ?? "NFT"} #${nft.identifier}`,
        image: nft.display_image_url || nft.image_url || "",
        collection: collection?.name ?? nft.collection ?? "OpenSea",
        contract: nft.contract,
        link: nft.opensea_url || `https://opensea.io/item/robinhood/${nft.contract}/${nft.identifier}`,
        wallet,
      },
    ];
  });

  const value: Portfolio = {
    owner,
    holdings: ownerHoldings,
    nfts,
    wallets: nfts.filter((nft) => nft.wallet).length,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
