export type Trend = {
  slug: string;
  kicker: string;
  title: string;
  body: string;
  source: string;
  href: string;
};

export const TRENDS: readonly Trend[] = [
  {
    slug: "the-repricing",
    kicker: "FLOORS",
    title: "StonkBrokers left the August print behind.",
    body: "In mid-August the floor was quoted at 13.41 ETH, with each broker carrying a token-bound wallet of stock tokens. The same collection now trades on this desk near a fraction of that print. The wallet is still the product. The price is the argument.",
    source: "KuCoin flash, 2026",
    href: "https://www.kucoin.com/news/flash/stonkbrokers-nft-floor-surpasses-bored-ape-yacht-club-on-robinhood-chain",
  },
  {
    slug: "the-book",
    kicker: "OPENSEA",
    title: "Robinhood Chain already has a public book.",
    body: "OpenSea turned the chain on in July 2026, the same month mainnet opened. Stock tokens, community coins, and NFT floors sit in one filter. This desk fills the listings and the bids that book already has, instead of inventing a second marketplace.",
    source: "OpenSea",
    href: "https://opensea.io/blog/articles/robinhood-chain-is-live-on-opensea",
  },
  {
    slug: "the-wallet-inside",
    kicker: "WALLETS",
    title: "The interesting NFTs are accounts.",
    body: "A StonkBroker and an RH Machine each resolve to an ERC-6551 account. CCFF00 was minted as a membership with the same idea: the token moves, and the account moves with it. The bag on this desk opens the accounts whose derivation checks out on chain.",
    source: "Unchained",
    href: "https://unchainedcrypto.com/how-robinhood-chains-nft-darling-blends-securities-and-collectibles-unchained/",
  },
  {
    slug: "the-cheap-pack",
    kicker: "PACKS",
    title: "The new sets are priced like stickers.",
    body: "Dogihood's pixel Shibas and HoodStreet's neon marks are the other side of the August spike. Floors sit in fractions of an ETH while Genesis still clears in USDG. The chain is running a stock-wallet story and a cheap-PFP story at the same time.",
    source: "Dogihood",
    href: "https://dogihood.com/",
  },
];
