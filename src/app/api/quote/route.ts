import { connection, NextRequest } from "next/server";
import { findToken } from "@/config/tokens";
import { formatDisplay, parseAmount } from "@/lib/format";
import { quoteBest } from "@/lib/quote";
import { poolToken } from "@/lib/swap-call";

const QUOTE_TTL_MS = 8_000;
const quoteCache = new Map<string, { at: number; body: string }>();

export async function GET(request: NextRequest) {
  await connection();
  const cacheKey = request.nextUrl.search;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.at < QUOTE_TTL_MS) {
    return new Response(cached.body, {
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=8",
      },
    });
  }
  const tokenIn = findToken(request.nextUrl.searchParams.get("tokenIn") ?? "");
  const tokenOut = findToken(request.nextUrl.searchParams.get("tokenOut") ?? "");
  const amount = request.nextUrl.searchParams.get("amount") ?? "";
  const slippageRaw = request.nextUrl.searchParams.get("slippageBps");
  const slippageBps = slippageRaw ? Number(slippageRaw) : 50;

  if (!tokenIn || !tokenOut) {
    return Response.json({ error: "Unknown token." }, { status: 400 });
  }
  if (tokenIn.symbol === tokenOut.symbol) {
    return Response.json({ error: "Choose two different tokens." }, { status: 400 });
  }
  if (!Number.isInteger(slippageBps) || slippageBps <= 0 || slippageBps > 5_000) {
    return Response.json({ error: "Slippage must sit between 0.01% and 50%." }, { status: 400 });
  }

  const amountIn = parseAmount(amount, tokenIn.decimals);
  if (amountIn === null) {
    return Response.json({ error: "Enter an amount that fits this token." }, { status: 400 });
  }

  try {
    const quote = await quoteBest({
      tokenIn: poolToken(tokenIn.address),
      tokenOut: poolToken(tokenOut.address),
      amountIn,
      slippageBps,
    });
    if (!quote) {
      return Response.json(
        { error: "No Uniswap v3 pool for this pair." },
        { status: 404 },
      );
    }
    const twapGapBps =
      quote.twapAmountOut && quote.twapAmountOut > 0n
        ? Number(((quote.twapAmountOut - quote.amountOut) * 10_000n) / quote.twapAmountOut)
        : null;
    const body = JSON.stringify({
      fee: quote.fee,
      amountOut: quote.amountOut.toString(),
      amountOutMinimum: quote.amountOutMinimum.toString(),
      amountOutDisplay: formatDisplay(quote.amountOut, tokenOut.decimals),
      minimumDisplay: formatDisplay(quote.amountOutMinimum, tokenOut.decimals),
      priceImpactBps: quote.priceImpactBps,
      twapDisplay: quote.twapAmountOut ? formatDisplay(quote.twapAmountOut, tokenOut.decimals) : null,
      twapWindow: quote.twapWindow,
      twapGapBps,
    });
    quoteCache.set(cacheKey, { at: Date.now(), body });
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quote failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
