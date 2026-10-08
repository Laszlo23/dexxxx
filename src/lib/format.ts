import { formatUnits, parseUnits } from "viem";

export function parseAmount(value: string, decimals: number): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const fraction = trimmed.split(".")[1];
  if (fraction && fraction.length > decimals) return null;
  try {
    const parsed = parseUnits(trimmed, decimals);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function formatDisplay(amount: bigint, decimals: number): string {
  const numeric = Number(formatUnits(amount, decimals));
  if (!Number.isFinite(numeric)) return "—";
  if (numeric === 0) return "0";
  if (numeric >= 1000) {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (numeric >= 1) {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return numeric.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function feeLabel(fee: number): string {
  return `${(fee / 10_000).toFixed(2)}%`;
}

export function slippageBps(percent: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(percent.trim())) return null;
  const bps = Math.round(Number(percent) * 100);
  if (!Number.isFinite(bps) || bps <= 0 || bps > 5_000) return null;
  return bps;
}

export function explorerTx(hash: string): string {
  return `https://robinhoodchain.blockscout.com/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `https://robinhoodchain.blockscout.com/address/${address}`;
}

export function openseaItem(address: string, tokenId: string): string {
  return `https://opensea.io/item/robinhood/${address}/${tokenId}`;
}
