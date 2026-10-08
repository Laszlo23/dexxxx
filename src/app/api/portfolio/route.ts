import { isAddress, type Address } from "viem";
import { connection, NextRequest } from "next/server";
import { readPortfolio } from "@/lib/portfolio";

export async function GET(request: NextRequest) {
  await connection();
  const owner = request.nextUrl.searchParams.get("owner") ?? "";
  if (!isAddress(owner)) {
    return Response.json({ error: "Paste a Robinhood Chain address." }, { status: 400 });
  }
  try {
    const portfolio = await readPortfolio(owner as Address);
    return Response.json(portfolio);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The bag did not load.";
    return Response.json({ error: message }, { status: 502 });
  }
}
