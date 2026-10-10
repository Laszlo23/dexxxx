import { encodePacked, keccak256, type Address, type Hex } from "viem";

/** A browser search above this many hashes will not finish in one sitting. */
export const HASHCAT_SEARCH_LIMIT = 4_000_000n;

export function hashcatWork(miner: Address, nonce: bigint, prevWork: bigint, anchor: Hex): Hex {
  return keccak256(encodePacked(["address", "uint256", "uint256", "bytes32"], [miner, nonce, prevWork, anchor]));
}

export function hashcatEffort(target: bigint): bigint {
  if (target <= 0n) return 1n << 256n;
  return (1n << 256n) / target;
}

export function hashcatSearchable(target: bigint): boolean {
  return hashcatEffort(target) <= HASHCAT_SEARCH_LIMIT;
}
