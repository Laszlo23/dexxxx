import { connection } from "next/server";
import { collectionBoard } from "@/lib/collections";

export async function GET() {
  await connection();
  const collections = await collectionBoard();
  return Response.json({ collections });
}
