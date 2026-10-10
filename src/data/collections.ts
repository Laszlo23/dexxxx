import type { Address } from "viem";

export type SupplyFn = "totalSupply" | "totalMinted" | "maxSupply" | "idSpan";

export type NftCollection = {
  slug: string;
  name: string;
  symbol: string;
  address: Address;
  hero: boolean;
  idStart: number;
  /** Inclusive last token id when the contract does not expose a supply counter. */
  idEnd: number | null;
  supplyFn: SupplyFn;
  openseaSlug?: string;
  blurb: string;
  /** A use this desk has checked. Absent when the picture is only a picture. */
  use?: { title: string; body: string };
};

export const COLLECTIONS: readonly NftCollection[] = [
  {
    slug: "rare-friends-genesis",
    name: "Rare Friends Genesis",
    symbol: "GENESIS",
    address: "0x116EaA62241751E0c98dA43d458600c6C17cD361",
    hero: true,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalMinted",
    openseaSlug: "rare-friends-genesis",
    blurb: "1,024 on-chain friends. The mint that starts the Rare Friends economy.",
    use: {
      title: "Drawn in the contract",
      body: "A Genesis friend is SVG stored in the contract, not a JPEG on a server. This desk has not found a wallet inside the picture.",
    },
  },
  {
    slug: "stonkbrokers",
    name: "StonkBrokers",
    symbol: "STONK",
    address: "0x539cdd042c2f3d93ebc5be7dfff0c79f3b4fabf0",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "stonkbrokers-434284142",
    blurb: "4,444 brokers. Each one keeps a token-bound wallet for stock tokens.",
    use: {
      title: "The broker keeps an account",
      body: "Each StonkBroker controls an ERC-6551 account. Tokens held there, including STONKBROKER, stay with the picture. When the picture moves, the account moves with it.",
    },
  },
  {
    slug: "spritehood",
    name: "Spritehood",
    symbol: "WISP",
    address: "0xd6577124f96394faee65afd2408f2ffa88445f63",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "spritehood-wisps",
    blurb: "44,444 pixel wisps. The big Spritehood mint on Robinhood Chain.",
  },
  {
    slug: "cash-cats",
    name: "Cash Cats",
    symbol: "CASHCAT",
    address: "0xe3b34c4bb0f12c82143745eee6a6cf4e3154b1fa",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "cashcatss",
    blurb: "10,000 cats. One of the first collections to trade on the chain.",
  },
  {
    slug: "chain-mancers",
    name: "Chain Mancers",
    symbol: "MANCERS",
    address: "0x797a2e030b7e49107c8f07bf0300ea9cae88ca57",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "chain-mancers",
    blurb: "5,000 mancers built beside the $MANCER swap aggregator.",
  },
  {
    slug: "rh-machines",
    name: "RH Machines",
    symbol: "RHM",
    address: "0x8C71D170fBd94BCba93bB08FC2CFD0e8620cD9cE",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "rhmachines",
    blurb: "10,000 machines that hold tokenized stocks in their own accounts.",
    use: {
      title: "The machine holds stock tokens",
      body: "Each RH Machine controls an ERC-6551 account that can hold Robinhood stock tokens. The balances this desk reads are bound to the machine.",
    },
  },
  {
    slug: "hashcats",
    name: "Hashcats",
    symbol: "HCAT",
    address: "0xca75df55cc9c476db27a7375d1fc8e794cf80721",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalMinted",
    openseaSlug: "hash-cats",
    blurb: "Proof-of-work cats, drawn on-chain, one hash at a time.",
    use: {
      title: "A record of work",
      body: "Each cat was mined with proof of work, and the art is drawn on chain. This desk has not found a wallet inside the cat.",
    },
  },
  {
    slug: "pitboys",
    name: "PitBoys",
    symbol: "PITBOY",
    address: "0x57069d845701b50f41327362c1c23789043f8dec",
    hero: false,
    idStart: 2,
    idEnd: 6295,
    supplyFn: "idSpan",
    openseaSlug: "pitboys",
    blurb: "MineBoys bridged onto Robinhood Chain. Token ids run through 6,295.",
  },
  {
    slug: "onchainhoodies",
    name: "OnChainHoodies",
    symbol: "OCH",
    address: "0x9ec6c5b9f572a9b02138e553bc5f5882da735f45",
    hero: false,
    idStart: 0,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "onchainhoodies-",
    blurb: "6,000 fully on-chain hoodies. Token zero is a real hoodie.",
    use: {
      title: "Stored in the contract",
      body: "The hoodie lives in the contract, including token zero. This desk has not found a wallet inside it.",
    },
  },
  {
    slug: "dogihood",
    name: "Dogihood",
    symbol: "DOGI",
    address: "0x9273f6d13c45a18c9664cecf0e7ff1f7aa9440fa",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "maxSupply",
    openseaSlug: "dogihood",
    blurb: "5,000 pixel Shibas on Robinhood Chain. No promises. Just the pack.",
  },
  {
    slug: "ccff00",
    name: "CCFF00",
    symbol: "CCFF00",
    address: "0x505a22ffed8d37ebe580ffd98d2cdb0021189146",
    hero: false,
    idStart: 1,
    idEnd: null,
    supplyFn: "totalSupply",
    openseaSlug: "ccff00-161927574",
    blurb: "10,000 on-chain neon marks. Each one keeps a wallet.",
    use: {
      title: "The picture is the wallet",
      body: "Each CCFF00 controls an ERC-6551 account. That account can hold ETH, tokens, and other NFTs, and it was minted with 10,000 CCFF00. An agent can use the same account. When the picture moves, the account moves with it.",
    },
  },
];

export function findCollection(slug: string): NftCollection | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

export type PictureUse = { title: string; body: string };

export function collectionUse(address: string): PictureUse | null {
  const collection = COLLECTIONS.find((item) => item.address.toLowerCase() === address.toLowerCase());
  return collection?.use ?? null;
}
