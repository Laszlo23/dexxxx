import { createPublicClient, http } from "viem";
import { robinhood } from "@/config/chain";
import { rpcFetch } from "@/lib/rpc-fetch";

export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(process.env.ROBINHOOD_RPC_URL ?? robinhood.rpcUrls.default.http[0], {
    fetchFn: rpcFetch,
    timeout: 20_000,
  }),
});
