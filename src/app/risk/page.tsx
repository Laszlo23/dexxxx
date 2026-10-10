import { LegalFrame } from "@/components/site-footer";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Trading and pool risk",
  description: "The risks of swapping, collecting, and opening pools on the dex xxx desk.",
  path: "/risk",
  card: "risk",
});

export default function RiskPage() {
  return (
    <LegalFrame kicker="LEGAL" title="Risk">
      <p>
        Trading on this desk can lose money. Prices on Uniswap v3 move while a transaction is waiting, and a thin pool
        can move a lot for a small trade. The impact line on the ticket is there so you can see that before you
        confirm.
      </p>
      <p>
        Opening a pool sets the starting price to the number you type. A price far from the market can be traded
        against as soon as the pool has liquidity. A full-range position stays in the pool across that whole range.
      </p>
      <p>
        NFT floors and offers come from live listings. A listing can be filled or cancelled before your wallet
        confirms. Some mints are closed, sold out, or limited to a role on the contract, and the page says so.
      </p>
      <p>
        vibe.market packs on this desk are listed from the public shelf. The odds and the ETH price are the ones
        published with that pack. Opening one is a transaction you confirm in your wallet on vibe.market. A pack can
        return less than it cost.
      </p>
      <p>
        Smart contracts, the chain, and the wallet you use can fail or behave in ways the desk does not control. Read
        the transaction in your wallet before you confirm it.
      </p>
    </LegalFrame>
  );
}
