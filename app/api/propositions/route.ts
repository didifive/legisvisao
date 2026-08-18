import { db } from "@/lib/db";
import { PropositionWithVoteSession } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

    const cacheKey = `propositions_${query}_${sort}`;

    const data = await withServerCache(cacheKey, async () => {
      let sqlQuery = `
        SELECT 
          p.id,
          p.sigla_tipo,
          p.numero,
          p.ano,
          p.titulo,
          p.ementa,
          p.ementa_detalhada,
          p.tema,
          p.url_inteiro_teor,
          p.url_camara,
          p.data_apresentacao,
          p.ultimo_status,
          p.last_updated_at,
          vs.id as vote_session_id,
          vs.data_hora as vote_session_date,
          vs.descricao as vote_session_description,
          vs.resultado as vote_session_result,
          COALESCE(vs.total_sim, 0) as total_sim,
          COALESCE(vs.total_nao, 0) as total_nao,
          COALESCE(vs.total_outros, 0) as total_outros
        FROM propositions p
        INNER JOIN (
          SELECT 
            v.proposicao_id,
            v.id,
            v.data_hora,
            v.descricao,
            v.resultado,
            COUNT(CASE WHEN dv.voto_original ILIKE 'Sim%' THEN 1 END) as total_sim,
            COUNT(CASE WHEN dv.voto_original ILIKE 'N%' OR dv.voto_original ILIKE 'Não%' THEN 1 END) as total_nao,
            COUNT(CASE WHEN dv.voto_original NOT ILIKE 'Sim%' AND dv.voto_original NOT ILIKE 'N%' THEN 1 END) as total_outros
          FROM vote_sessions v
          LEFT JOIN deputy_votes dv ON dv.votacao_id = v.id
          GROUP BY v.id, v.proposicao_id, v.data_hora, v.descricao, v.resultado
        ) vs ON vs.proposicao_id = p.id
        WHERE 1=1
      `;

      const params: string[] = [];
      let paramIndex = 1;

      if (query) {
        sqlQuery += ` AND (p.titulo ILIKE $${paramIndex} OR p.ementa ILIKE $${paramIndex} OR p.tema ILIKE $${paramIndex})`;
        params.push(`%${query}%`);
        paramIndex++;
      }

      sqlQuery += ` ORDER BY vs.data_hora ${sort.toUpperCase()}`;

      const propositions = await db.unsafe<PropositionWithVoteSession[]>(sqlQuery, params);

      // Estados ativos dos deputados para filtros
      const statesResult = await db<Array<{ sigla_uf: string }>>`
        SELECT DISTINCT sigla_uf 
        FROM deputies 
        WHERE is_active = TRUE
        ORDER BY sigla_uf ASC;
      `;
      const states = statesResult.map((r) => r.sigla_uf);

      return {
        propositions,
        projects: propositions, // Suporte para views existentes
        states,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/propositions:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar proposições." },
      { status: 500 }
    );
  }
}
