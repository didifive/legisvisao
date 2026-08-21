import { db } from "@/lib/db";
import { PropositionWithVoteSession } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const sort = searchParams.get("sort") || "relevance";

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
          p.resumo_geral,
          p.last_updated_at,
          vs.id as vote_session_id,
          vs.data_hora as vote_session_date,
          vs.descricao as vote_session_description,
          vs.resultado as vote_session_result,
          vs.tipo_deliberacao,
          vs.titulo_amigavel,
          vs.resumo_simplificado,
          COALESCE(vs.total_sim, 0) as total_sim,
          COALESCE(vs.total_nao, 0) as total_nao,
          COALESCE(vs.total_outros, 0) as total_outros
        FROM propositions p
        INNER JOIN (
          SELECT DISTINCT ON (v.proposicao_id)
            v.proposicao_id,
            v.id,
            v.data_hora,
            v.descricao,
            v.resultado,
            v.tipo_deliberacao,
            v.titulo_amigavel,
            v.resumo_simplificado,
            COUNT(CASE WHEN dv.voto_original ILIKE 'Sim%' THEN 1 END)::int as total_sim,
            COUNT(CASE WHEN dv.voto_original ILIKE 'N%' OR dv.voto_original ILIKE 'Não%' THEN 1 END)::int as total_nao,
            COUNT(CASE WHEN dv.voto_original NOT ILIKE 'Sim%' AND dv.voto_original NOT ILIKE 'N%' THEN 1 END)::int as total_outros
          FROM vote_sessions v
          JOIN deputy_votes dv ON dv.votacao_id = v.id
          GROUP BY v.id, v.proposicao_id, v.data_hora, v.descricao, v.resultado, v.tipo_deliberacao, v.titulo_amigavel, v.resumo_simplificado
          HAVING COUNT(CASE WHEN dv.voto_original ILIKE 'Sim%' OR dv.voto_original ILIKE 'N%' OR dv.voto_original ILIKE 'Não%' THEN 1 END) > 0
          ORDER BY 
            v.proposicao_id,
            CASE 
              WHEN v.tipo_deliberacao = 'MERITO' THEN 1
              WHEN v.descricao ILIKE '%turno%' OR v.descricao ILIKE '%texto-base%' OR v.descricao ILIKE '%texto base%' OR v.descricao ILIKE '%substitutivo%' OR v.descricao ILIKE '%redação final%' OR v.descricao ILIKE '%redacao final%' THEN 1
              WHEN v.tipo_deliberacao = 'EMENDA' OR v.descricao ILIKE 'emenda%' THEN 2
              WHEN v.tipo_deliberacao = 'DESTAQUE' OR v.descricao ILIKE '%destaque%' OR v.descricao ILIKE 'mantido o texto%' OR v.descricao ILIKE 'suprimido o texto%' THEN 3
              ELSE 4
            END ASC,
            v.data_hora DESC,
            COUNT(CASE WHEN dv.voto_original ILIKE 'Sim%' OR dv.voto_original ILIKE 'N%' OR dv.voto_original ILIKE 'Não%' THEN 1 END) DESC,
            v.id DESC
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

      const sortParam = searchParams.get("sort");
      if (sortParam === "data_asc" || sortParam === "asc") {
        sqlQuery += ` ORDER BY vs.data_hora ASC, p.id ASC`;
      } else if (sortParam === "data_desc") {
        sqlQuery += ` ORDER BY vs.data_hora DESC, p.id DESC`;
      } else {
        // Ordenação Padrão por Relevância e Impacto Político:
        // 1. Maior Quórum Total (Sim + Não + Outros)
        // 2. Menor Abstenção e Outros Votos
        // 3. Menor Diferença Absoluta entre Sim e Não (mais disputada/polarizada)
        // 4. Data mais recente e ID
        sqlQuery += `
          ORDER BY 
            (COALESCE(vs.total_sim, 0) + COALESCE(vs.total_nao, 0) + COALESCE(vs.total_outros, 0)) DESC,
            COALESCE(vs.total_outros, 0) ASC,
            ABS(COALESCE(vs.total_sim, 0) - COALESCE(vs.total_nao, 0)) ASC,
            vs.data_hora DESC,
            p.id DESC
        `;
      }

      const propositionsRaw = await db.unsafe<PropositionWithVoteSession[]>(sqlQuery, params);
      const propositions: PropositionWithVoteSession[] = propositionsRaw.map((p) => ({
        ...p,
        total_sim: Number(p.total_sim || 0),
        total_nao: Number(p.total_nao || 0),
        total_outros: Number(p.total_outros || 0),
      }));

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
