import { db } from "@/lib/db";
import { PoliticianSearchResult, SQLParam } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const state = searchParams.get("state") || "";
    const type = searchParams.get("type") || "";

    const cacheKey = `politicians_${query}_${state}_${type}`;

    const data = await withServerCache(cacheKey, async () => {
      let sqlQuery = `
        SELECT DISTINCT ON (p.id)
          p.id,
          p.source,
          p.external_id,
          p.name,
          p.type,
          p.state,
          p.photo_url,
          part.sigla AS party_sigla,
          part.nome AS party_name,
          m.office AS mandate_office
        FROM politicians p
        LEFT JOIN politician_party_history pph ON p.id = pph.politician_id AND pph.end_date IS NULL
        LEFT JOIN political_parties part ON pph.party_id = part.id
        LEFT JOIN mandates m ON p.id = m.politician_id AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
        WHERE p.is_active = TRUE
      `;

      const params: SQLParam[] = [];
      let paramIndex = 1;

      if (query) {
        sqlQuery += ` AND p.name ILIKE $${paramIndex}`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      if (state) {
        sqlQuery += ` AND p.state = $${paramIndex}`;
        params.push(state.toUpperCase());
        paramIndex++;
      }

      if (type) {
        sqlQuery += ` AND p.type = $${paramIndex}`;
        params.push(type.toUpperCase());
        paramIndex++;
      }

      sqlQuery += ` ORDER BY p.id, p.name ASC`;

      const rows = await db.unsafe<PoliticianSearchResult[]>(sqlQuery, params);
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/politicians:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter parlamentares." },
      { status: 500 }
    );
  }
}
