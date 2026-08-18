import { db } from "@/lib/db";
import { SQLParam } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const house = searchParams.get("house") || searchParams.get("source") || "";
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

    const cacheKey = `projects_${query}_${house}_${sort}`;

    const data = await withServerCache(cacheKey, async () => {
      // Regra de Elegibilidade: Somente propostas com ao menos 1 sessão de votação nominal registrada
      let sqlQuery = `
        SELECT 
          p.id,
          p.canonical_id,
          p.type,
          p.number,
          p.year,
          p.title,
          p.description,
          p.current_status,
          p.last_updated_at,
          rec.official_urls,
          rec.houses,
          vs.last_vote_date,
          vs.last_vote_description
        FROM legislative_projects p
        INNER JOIN (
          SELECT 
            phr.project_id,
            json_agg(phr.official_url) as official_urls,
            string_agg(DISTINCT phr.house, ', ') as houses
          FROM project_house_records phr
          GROUP BY phr.project_id
        ) rec ON rec.project_id = p.id
        INNER JOIN (
          SELECT 
            phr.project_id,
            MAX(vs_inner.date) as last_vote_date,
            (
              SELECT vs2.description 
              FROM vote_sessions vs2
              JOIN project_house_records phr2 ON phr2.id = vs2.house_record_id
              WHERE phr2.project_id = phr.project_id
              ORDER BY vs2.date DESC LIMIT 1
            ) as last_vote_description,
            COUNT(vs_inner.id) as total_sessions
          FROM project_house_records phr
          JOIN vote_sessions vs_inner ON vs_inner.house_record_id = phr.id
          GROUP BY phr.project_id
          HAVING COUNT(vs_inner.id) > 0
        ) vs ON vs.project_id = p.id
        WHERE 1=1
      `;

      const params: SQLParam[] = [];
      let paramIndex = 1;

      if (query) {
        sqlQuery += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.canonical_id ILIKE $${paramIndex})`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      if (house) {
        sqlQuery += ` AND rec.houses ILIKE $${paramIndex}`;
        params.push(`%${house}%`);
        paramIndex++;
      }

      sqlQuery += ` ORDER BY COALESCE(vs.last_vote_date, p.last_updated_at, '1900-01-01') ${sort.toUpperCase()}`;

      const projects = await db.unsafe<any[]>(sqlQuery, params);

      // Estados de parlamentares ativos para os filtros
      const statesResult = await db`
        SELECT DISTINCT state 
        FROM politicians 
        WHERE is_active = TRUE
        ORDER BY state ASC;
      `;
      const states = statesResult.map((r) => r.state);

      return {
        projects,
        states,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/projects:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar projetos." },
      { status: 500 }
    );
  }
}
