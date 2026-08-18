import { db } from "@/lib/db";
import { Party } from "@/types/db";
import { NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const parties = await withServerCache("parties_all", async () => {
      return await db<Party[]>`
        SELECT * FROM parties 
        WHERE total_membros > 0
        ORDER BY total_membros DESC, sigla ASC;
      `;
    });

    return NextResponse.json(parties);
  } catch (error) {
    console.error("Erro em GET /api/parties:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter partidos." },
      { status: 500 }
    );
  }
}
