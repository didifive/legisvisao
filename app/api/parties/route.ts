import { db } from "@/lib/db";
import { PoliticalParty } from "@/types/db";
import { NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export async function GET() {
  try {
    const parties = await withServerCache("parties_all", async () => {
      return await db<PoliticalParty[]>`
        SELECT * FROM political_parties 
        ORDER BY sigla ASC
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
