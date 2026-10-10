import { LegalFrame } from "@/components/site-footer";
import { pageMeta } from "@/lib/page-meta";

export const metadata = pageMeta({
  title: "Privacy policy",
  description: "What the dex xxx desk stores, and what stays in your wallet.",
  path: "/privacy",
  card: "privacy",
});

export default function PrivacyPage() {
  return (
    <LegalFrame kicker="LEGAL" title="Privacy">
      <p>The desk does not ask for an account, an email, or a password. This note was written on October 10, 2026.</p>
      <p>
        When you connect a wallet, the address is used in the browser to read balances, allowances, and the NFTs
        OpenSea can see for that address on Robinhood Chain. The desk tasks, such as a copied link, are saved in
        local storage on your device.
      </p>
      <p>
        Listing, offer, and collection reads go through this site’s server so the OpenSea key stays there. Swap quotes
        are read from the Robinhood Chain RPC. WalletConnect uses its own relay when you pair a phone wallet. Those
        services see the request your browser or the server sends.
      </p>
      <p>
        The desk does not sell personal information. It does not keep a private profile of the wallets that visit.
        Transaction data on Robinhood Chain is public once you confirm it.
      </p>
    </LegalFrame>
  );
}
