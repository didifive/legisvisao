import { db } from "@/lib/db";
import { DeputySearchResult } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || searchParams.get("search") || "";
    const state = searchParams.get("state") || searchParams.get("uf") || "";
    const party = searchParams.get("party") || searchParams.get("partido") || "";

    const cacheKey = `deputies_${query}_${state}_${party}`;

    const data = await withServerCache(cacheKey, async () => {
      let sqlQuery = `
        SELECT 
          d.id,
          d.nome,
          d.nome_eleitoral,
          d.sigla_partido,
          d.sigla_uf,
          d.url_foto,
          d.email,
          d.situacao,
          0 as matches_count,
          0 as comparable_count,
          NULL as adherence
        FROM deputies d
        WHERE d.is_active = TRUE
      `;

      const params: string[] = [];
      let paramIndex = 1;

      if (query) {
        sqlQuery += ` AND (d.nome ILIKE $${paramIndex} OR d.nome_eleitoral ILIKE $${paramIndex})`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      if (state) {
        sqlQuery += ` AND d.sigla_uf = $${paramIndex}`;
        params.push(state.toUpperCase());
        paramIndex++;
      }

      if (party) {
        sqlQuery += ` AND d.sigla_partido = $${paramIndex}`;
        params.push(party.toUpperCase());
        paramIndex++;
      }

      sqlQuery += ` ORDER BY d.nome_eleitoral ASC`;

      const rows = await db.unsafe<DeputySearchResult[]>(sqlQuery, params);
      return rows;
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/deputies:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar deputados federais." },
      { status: 500 }
    );
  }
}
