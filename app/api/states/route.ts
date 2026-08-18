import { db } from "@/lib/db";
import { withServerCache } from "@/lib/server-cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await withServerCache("api_states", async () => {
      const rows = await db<Array<{ sigla_uf: string }>>`
        SELECT DISTINCT sigla_uf 
        FROM deputies 
        WHERE is_active = TRUE
        ORDER BY sigla_uf ASC;
      `;
      return rows.map((r) => r.sigla_uf);
    });

    return NextResponse.json(states);
  } catch (error) {
    console.error("Erro em GET /api/states:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter estados." },
      { status: 500 }
    );
  }
}
