import { encodeFunctionData, type Address, type Hex } from "viem";
import { routerAbi } from "@/config/abis";
import { ADDRESS_THIS, SWAP_ROUTER_02, WETH } from "@/config/contracts";

export type SwapCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

export function poolToken(address: Address | "native"): Address {
  return address === "native" ? WETH : address;
}

export function buildSwapCall(input: {
  tokenIn: Address | "native";
  tokenOut: Address | "native";
  fee: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
}): SwapCall {
  const nativeIn = input.tokenIn === "native";
  const nativeOut = input.tokenOut === "native";
  const tokenIn = poolToken(input.tokenIn);
  const tokenOut = poolToken(input.tokenOut);

  const swapData = encodeFunctionData({
    abi: routerAbi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        fee: input.fee,
        recipient: nativeOut ? ADDRESS_THIS : input.recipient,
        amountIn: input.amountIn,
        amountOutMinimum: input.amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  if (!nativeOut) {
    return {
      to: SWAP_ROUTER_02,
      data: swapData,
      value: nativeIn ? input.amountIn : 0n,
    };
  }

  const unwrapData = encodeFunctionData({
    abi: routerAbi,
    functionName: "unwrapWETH9",
    args: [input.amountOutMinimum, input.recipient],
  });
  const data = encodeFunctionData({
    abi: routerAbi,
    functionName: "multicall",
    args: [[swapData, unwrapData]],
  });
  return {
    to: SWAP_ROUTER_02,
    data,
    value: nativeIn ? input.amountIn : 0n,
  };
}
