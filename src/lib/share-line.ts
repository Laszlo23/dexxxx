type ShareHolding = { display: string; symbol: string };

export function pictureShareLine(reading: {
  name: string;
  use: { title: string } | null;
  wallet: { holdings: ShareHolding[] } | null;
}): string {
  const funds = reading.wallet?.holdings
    .slice(0, 2)
    .map((holding) => `${holding.display} ${holding.symbol}`)
    .join(" and ");
  const use = reading.use?.title;
  if (use && funds) return `${reading.name}. ${use}. ${funds} bound to the picture.`;
  if (use) return `${reading.name}. ${use}.`;
  if (funds) return `${reading.name} keeps ${funds}.`;
  return `${reading.name} on Robinhood Chain. The desk read the picture.`;
}
