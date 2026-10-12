export const CARDS = {
  home: {
    kicker: "ROBINHOOD CHAIN",
    title: "dex xxx",
    line: "Swaps, NFTs, pools, and the bag. Chain 4663.",
  },
  vibe: {
    kicker: "VIBE.MARKET",
    title: "Packs on Robinhood",
    line: "ETH packs from the live shelf. The wallet opens them.",
  },
  pools: {
    kicker: "POOLS",
    title: "Uniswap v3 for the NFT tokens",
    line: "Rare Friends, StonkBroker, and CCFF00. You type the price.",
  },
  friends: {
    kicker: "GENESIS",
    title: "Rare Friends Genesis",
    line: "1,024 on-chain friends. The book is a live listing.",
  },
  collections: {
    kicker: "REGISTRY",
    title: "Verified NFT collections",
    line: "ERC-721 sets read from Robinhood Chain before they land here.",
  },
  portfolio: {
    kicker: "THE BAG",
    title: "Balances, NFTs, and their wallets",
    line: "The bag shows the tokens and the accounts inside the NFTs.",
  },
  bound: {
    kicker: "ONE PICTURE",
    title: "Funds bound to an NFT",
    line: "Paste a token. The desk reads the account inside it.",
  },
  trends: {
    kicker: "THE TAPE",
    title: "Floors and the market notes",
    line: "What the Robinhood NFT book is doing, written down.",
  },
  terms: {
    kicker: "LEGAL",
    title: "Terms of the desk",
    line: "The interface explains the trade. The wallet confirms it.",
  },
  privacy: {
    kicker: "LEGAL",
    title: "Privacy on the desk",
    line: "The address stays in the browser. The chain keeps the trade.",
  },
  risk: {
    kicker: "LEGAL",
    title: "Read this before you sign",
    line: "Prices move. Pools can be thin. The wallet has the last word.",
  },
  rfgame: {
    kicker: "RARE HOOD",
    title: "Five castles. One coin.",
    line: "Walk a Rare Friend through the clocks. The HOOD is simulated.",
  },
  mark: {
    kicker: "THE MARK",
    title: "Five rooms on the street",
    line: "Tell a wallet from a picture. The chain scores the room.",
  },
  gm: {
    kicker: "GM",
    title: "gm from chain 4663",
    line: "The desk said good morning. The wallet can say it back.",
  },
  book: {
    kicker: "THE BOOK",
    title: "ETH, USDG, and the stocks",
    line: "One book. Flip the pair, read the average, then sign.",
  },
  genesis: {
    kicker: "FRIENDS",
    title: "Rare Friends are on the desk",
    line: "Genesis is sitting beside the swap. The floor is a real ask.",
  },
  wallets: {
    kicker: "INSIDE",
    title: "Some of these NFTs keep a wallet",
    line: "Open a StonkBroker. The account inside is already there.",
  },
  hood: {
    kicker: "RARE HOOD",
    title: "Five castles. Your friend. A coin.",
    line: "Lure a guard off the route and beat the clock.",
  },
  liquid: {
    kicker: "POOLS",
    title: "The NFT tokens want a pool",
    line: "You type the opening price. The wallet opens the market.",
  },
} as const;

export type CardId = keyof typeof CARDS;

export type SharePost = {
  id: CardId;
  headline: string;
  line: string;
  tweet: string;
  href: string;
  cta: string;
};

export const SHARE_POSTS: readonly SharePost[] = [
  {
    id: "gm",
    headline: "gm from chain 4663",
    line: "The desk said good morning. The wallet can say it back.",
    tweet: "gm. The Robinhood Chain desk is open. Swaps, the NFT book, and the bag.",
    href: "/",
    cta: "Open the desk",
  },
  {
    id: "book",
    headline: "One book for ETH, USDG, and the stocks.",
    line: "Flip the pair, read the 30-minute average, then let the wallet sign.",
    tweet: "ETH, USDG, and the Robinhood stock tokens are on one book.",
    href: "/",
    cta: "Open the book",
  },
  {
    id: "genesis",
    headline: "Rare Friends are sitting on the desk.",
    line: "1,024 on-chain friends. The floor is a live listing.",
    tweet: "Rare Friends Genesis is on the Robinhood desk. The book is live.",
    href: "/friends",
    cta: "Open Rare Friends",
  },
  {
    id: "wallets",
    headline: "Some of these NFTs keep a wallet.",
    line: "StonkBrokers and the machines hold accounts. The bag shows them.",
    tweet: "Open the bag. Some Robinhood NFTs keep a wallet of their own.",
    href: "/portfolio",
    cta: "Open the bag",
  },
  {
    id: "hood",
    headline: "Five castles. One coin. Your friend.",
    line: "Lure a guard off the route and beat the clock. The HOOD is simulated.",
    tweet: "Rare Hood is a castle heist for your Rare Friend. Five clocks, one coin.",
    href: "/rfgame",
    cta: "Play Rare Hood",
  },
  {
    id: "liquid",
    headline: "The NFT tokens want a pool.",
    line: "Rare Friends, StonkBroker, and CCFF00. You type the price. The wallet opens it.",
    tweet: "NFT token pools on Robinhood Chain. You set the price. The wallet confirms.",
    href: "/pools",
    cta: "Open the pools",
  },
];

export function cardFor(id: string) {
  if (id in CARDS) return CARDS[id as CardId];
  return null;
}

export function findSharePost(id: string) {
  return SHARE_POSTS.find((post) => post.id === id) ?? null;
}
