import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { BRAND } from "@/config/brand";
import { robinhood } from "@/config/chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const siteUrl = typeof window === "undefined" ? "https://dex.aibusiness.fun" : window.location.origin;

const walletConnectConnector = projectId
  ? walletConnect({
      projectId,
      showQrModal: false,
      metadata: {
        name: BRAND,
        description: "Robinhood Chain desk for swaps, NFTs, and the bag.",
        url: siteUrl,
        icons: [`${siteUrl}/icon.png`],
      },
    })
  : null;

export const config = createConfig({
  chains: [robinhood],
  connectors: [injected(), ...(walletConnectConnector ? [walletConnectConnector] : [])],
  transports: {
    [robinhood.id]: http(robinhood.rpcUrls.default.http[0]),
  },
  ssr: true,
});
