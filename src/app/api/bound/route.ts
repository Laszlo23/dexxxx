import { connection, NextRequest } from "next/server";
import { parseNftQuery, readNftBinding } from "@/lib/portfolio";

export async function GET(request: NextRequest) {
  await connection();
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const parsed = parseNftQuery(query);
  if (!parsed) {
    return Response.json(
      { error: "Paste a collection and token, or a contract and token id. CCFF00 #1 works." },
      { status: 400 },
    );
  }
  try {
    const reading = await readNftBinding(parsed.contract, parsed.id);
    return Response.json(reading);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That picture did not read.";
    return Response.json({ error: message }, { status: 502 });
  }
}
