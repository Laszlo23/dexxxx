import { connection } from "next/server";
import { collectionBoard } from "@/lib/collections";

const BOARD_TTL_MS = 30_000;
let boardCache: { at: number; body: string } | null = null;

export async function GET() {
  await connection();
  if (boardCache && Date.now() - boardCache.at < BOARD_TTL_MS) {
    return new Response(boardCache.body, {
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  }
  const collections = await collectionBoard();
  const body = JSON.stringify({ collections });
  boardCache = { at: Date.now(), body };
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
