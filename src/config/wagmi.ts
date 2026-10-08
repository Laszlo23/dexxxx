import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhood } from "@/config/chain";

export const config = createConfig({
  chains: [robinhood],
  connectors: [injected()],
  transports: {
    [robinhood.id]: http(robinhood.rpcUrls.default.http[0]),
  },
  ssr: true,
});
