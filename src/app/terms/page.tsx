import { LegalFrame } from "@/components/site-footer";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Terms of use",
  description: "How the dex xxx desk works, and what you confirm in your own wallet.",
  path: "/terms",
  card: "terms",
});

export default function TermsPage() {
  return (
    <LegalFrame kicker="LEGAL" title="Terms">
      <p>These terms cover the dex xxx desk at dex.aibusiness.fun. They were written for this desk on October 10, 2026.</p>
      <p>
        The desk is an interface. Swaps settle through Uniswap v3 on Robinhood Chain. NFT listings and offers settle
        through OpenSea’s Seaport contracts. Pools open through the Uniswap v3 position manager. Your wallet signs
        every one of those transactions.
      </p>
      <p>
        Quotes, floors, and pool prices are read from public contracts and public market data. They move. A quote on
        the page is the price at the moment it was read, and the transaction you confirm can differ by the slippage
        you set.
      </p>
      <p>
        Stock and fund tokens on the desk are the issuer contracts listed for Robinhood Chain. The desk shows their
        symbols and routes a swap. It does not transfer legal title to a share, a fund, or a company.
      </p>
      <p>
        You are responsible for the wallet you connect, the amounts you type, and the prices you set when you open a
        pool. The desk does not hold your keys and cannot reverse a confirmed transaction.
      </p>
    </LegalFrame>
  );
}
