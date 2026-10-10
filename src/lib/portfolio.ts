import { erc20Abi, isAddress, zeroAddress, zeroHash, type Address, type Hex } from "viem";
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

export type AccountKind = "wallet" | "agent";

type BoundWallet = {
  registry: Address;
  implementation: Address;
  salt: Hex;
  kind: AccountKind;
  /** Show the account even when it is empty. Derivation was checked on chain. */
  always: boolean;
};

/** Collections whose account formula is not the public erc6551* getters. */
const KNOWN: Record<string, BoundWallet> = {
  stonkbrokers: {
    registry: "0x28c154cbdeaecbf5f72b6ae48535ab9a431a4161",
    implementation: "0xE946075125843aAdb5e40e59f513d929AF507C4B",
    salt: zeroHash,
    kind: "wallet",
    always: true,
  },
  "rh-machines": {
    registry: CANONICAL_REGISTRY,
    implementation: "0xaaf7bb9d1a9e51eb87fd86a2df818e72bf5e3baa",
    salt: zeroHash,
    kind: "wallet",
    always: true,
  },
  ccff00: {
    registry: CANONICAL_REGISTRY,
    implementation: "0x03dA8C9df253a4401b08629a6F50E4c4E8e248cC",
    salt: "0x448cc5ed5a52db42393a3d48476af932464724d8262648ad18b66d2ffef1a8e0",
    kind: "agent",
    always: true,
  },
};

/** HoodStreet's live agent executes through this token-bound implementation. */
const AGENT_IMPLEMENTATION = KNOWN.ccff00.implementation;

const discoverAbi = [
  {
    type: "function",
    name: "erc6551Registry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "erc6551Implementation",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "erc6551Salt",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

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
    address: "0x73CB777311Dc5e464C53Ddafb4496Fd87fE0eC97" as Address,
    decimals: 18,
  },
  {
    symbol: "CCFF00",
    name: "CCFF00 market",
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
  kind: AccountKind;
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
  /** OpenSea still had pictures after the pages this read opened. */
  more: boolean;
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

function pictureName(given: string | undefined, collectionName: string, id: string): string {
  const name = given?.trim();
  if (!name) return `${collectionName} #${id}`;
  const marker = `#${id}`;
  const at = name.lastIndexOf(marker);
  const alreadyNamed = at !== -1 && !/\d/.test(name.charAt(at + marker.length));
  return alreadyNamed ? name : `${collectionName} #${id}`;
}

function collectionFor(address: string) {
  return COLLECTIONS.find((item) => item.address.toLowerCase() === address.toLowerCase());
}

function isErc20(
  token: (typeof TRACKED)[number],
): token is (typeof TRACKED)[number] & { address: Address } {
  return token.address !== "native";
}

async function readHoldings(addresses: readonly Address[]): Promise<Holding[][]> {
  const rows: Holding[][] = [];
  for (let index = 0; index < addresses.length; index += 12) {
    rows.push(...(await readHoldingChunk(addresses.slice(index, index + 12))));
  }
  return rows;
}

async function readHoldingChunk(addresses: readonly Address[]): Promise<Holding[][]> {
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

const NFT_PAGE = 50;
const GENERAL_PAGES = 6;
const COLLECTION_PAGES = 6;

async function nftPages(
  owner: Address,
  key: string,
  maxPages: number,
  collection?: string,
): Promise<{ nfts: RawNft[]; more: boolean }> {
  const found: RawNft[] = [];
  let next: string | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const search = new URLSearchParams({ limit: String(NFT_PAGE) });
    if (collection) search.set("collection", collection);
    if (next) search.set("next", next);
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/robinhood/account/${owner}/nfts?${search}`,
      { headers: { "x-api-key": key, accept: "application/json" }, signal: AbortSignal.timeout(12_000), cache: "no-store" },
    );
    if (!response.ok) break;
    const body = (await response.json()) as { nfts?: RawNft[]; next?: string | null };
    found.push(...(body.nfts ?? []));
    next = body.next ?? null;
    if (!next) return { nfts: found, more: false };
  }
  return { nfts: found, more: next !== null };
}

async function accountNfts(owner: Address): Promise<{ nfts: RawNft[]; more: boolean }> {
  const key = process.env.OPENSEA_API_KEY;
  if (!key) return { nfts: [], more: false };
  const slugs = COLLECTIONS.flatMap((collection) =>
    KNOWN[collection.slug] && collection.openseaSlug ? [collection.openseaSlug] : [],
  );
  const [general, ...focused] = await Promise.all([
    nftPages(owner, key, GENERAL_PAGES),
    ...slugs.map((slug) => nftPages(owner, key, COLLECTION_PAGES, slug)),
  ]);
  const merged = new Map<string, RawNft>();
  for (const batch of [general, ...focused]) {
    for (const nft of batch.nfts) {
      if (!nft.contract || !nft.identifier) continue;
      merged.set(`${nft.contract.toLowerCase()}:${nft.identifier}`, nft);
    }
  }
  return {
    nfts: [...merged.values()],
    more: [general, ...focused].some((batch) => batch.more),
  };
}

function knownBound(contract: Address): BoundWallet | undefined {
  const collection = collectionFor(contract);
  return collection ? KNOWN[collection.slug] : undefined;
}

async function discoverBound(contracts: Address[]): Promise<Map<string, BoundWallet>> {
  const found = new Map<string, BoundWallet>();
  if (contracts.length === 0) return found;
  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: contracts.flatMap((address) =>
      (["erc6551Registry", "erc6551Implementation", "erc6551Salt"] as const).map((functionName) => ({
        address,
        abi: discoverAbi,
        functionName,
      })),
    ),
  });
  const candidates: { contract: Address; config: BoundWallet }[] = [];
  contracts.forEach((contract, index) => {
    const registry = results[index * 3];
    const implementation = results[index * 3 + 1];
    const salt = results[index * 3 + 2];
    if (registry?.status !== "success" || implementation?.status !== "success" || salt?.status !== "success") return;
    if (registry.result === zeroAddress || implementation.result === zeroAddress) return;
    candidates.push({
      contract,
      config: {
        registry: registry.result,
        implementation: implementation.result,
        salt: salt.result,
        kind: implementation.result.toLowerCase() === AGENT_IMPLEMENTATION.toLowerCase() ? "agent" : "wallet",
        always: true,
      },
    });
  });
  const codes = await Promise.all(
    candidates.map((row) => publicClient.getCode({ address: row.config.registry })),
  );
  candidates.forEach((row, index) => {
    const code = codes[index];
    if (!code || code === "0x") return;
    found.set(row.contract.toLowerCase(), row.config);
  });
  return found;
}

function compareId(left: string, right: string): number {
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    const a = BigInt(left);
    const b = BigInt(right);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  return left.localeCompare(right);
}

function collectionOrder(contract: Address): number {
  const index = COLLECTIONS.findIndex((item) => item.address.toLowerCase() === contract.toLowerCase());
  return index === -1 ? COLLECTIONS.length : index;
}

function compareNfts(left: BagNft, right: BagNft): number {
  const byWallet = Number(left.wallet === null) - Number(right.wallet === null);
  if (byWallet !== 0) return byWallet;
  const byCollection = collectionOrder(left.contract) - collectionOrder(right.contract);
  if (byCollection !== 0) return byCollection;
  if (left.collection !== right.collection) return left.collection.localeCompare(right.collection);
  return compareId(left.id, right.id);
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
        row.config.salt,
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

  const [ownerHoldings, scanned] = await Promise.all([
    readHoldings([owner]).then((rows) => rows[0] ?? []),
    accountNfts(owner),
  ]);
  const rawNfts = scanned.nfts;

  const seen = new Set<string>();
  const unknownContracts: Address[] = [];
  for (const nft of rawNfts) {
    if (!nft.contract || !isAddress(nft.contract)) continue;
    const contractKey = nft.contract.toLowerCase();
    if (seen.has(contractKey) || knownBound(nft.contract)) continue;
    seen.add(contractKey);
    unknownContracts.push(nft.contract);
  }
  const discovered = await discoverBound(unknownContracts).catch(() => new Map<string, BoundWallet>());
  const configFor = (contract: Address) => knownBound(contract) ?? discovered.get(contract.toLowerCase());

  const boundRows = rawNfts.flatMap((nft) => {
    if (!nft.contract || !isAddress(nft.contract) || !nft.identifier) return [];
    const config = configFor(nft.contract);
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
    const collectionName = collection?.name ?? nft.collection ?? "NFT";
    const name = pictureName(nft.name, collectionName, nft.identifier);
    const config = configFor(nft.contract);
    let wallet: NftWallet | null = null;
    if (config) {
      const account = accounts[cursor] ?? null;
      cursor += 1;
      const holdings = account ? (innerByAccount.get(account.toLowerCase()) ?? []) : [];
      if (account && (config.always || holdings.length > 0)) {
        wallet = { address: account, kind: config.kind, holdings };
      }
    }
    return [
      {
        id: nft.identifier,
        name,
        image: nft.display_image_url || nft.image_url || "",
        collection: collectionName,
        contract: nft.contract,
        link: nft.opensea_url || `https://opensea.io/item/robinhood/${nft.contract}/${nft.identifier}`,
        wallet,
      },
    ];
  });

  nfts.sort(compareNfts);

  const value: Portfolio = {
    owner,
    holdings: ownerHoldings,
    nfts,
    wallets: nfts.filter((nft) => nft.wallet).length,
    more: scanned.more,
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
