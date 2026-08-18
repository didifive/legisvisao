import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const partyId = Number(id);

    if (isNaN(partyId)) {
      return NextResponse.json(
        { error: "ID do partido inválido." },
        { status: 400 }
      );
    }

    const cacheKey = `party_details_${partyId}`;

    const data = await withServerCache(cacheKey, async () => {
      // 1. Dados do Partido
      const partyRes = await db`
        SELECT * FROM parties WHERE id = ${partyId} LIMIT 1;
      `;
      if (!partyRes || partyRes.length === 0) {
        return null;
      }
      const party = partyRes[0];

      // 2. Deputados do Partido em exercício
      const deputies = await db`
        SELECT 
          d.id,
          d.nome,
          d.nome_eleitoral,
          d.sigla_partido,
          d.sigla_uf,
          d.url_foto,
          d.email,
          d.situacao,
          d.legislatura
        FROM deputies d
        WHERE d.sigla_partido = ${party.sigla} AND d.is_active = TRUE
        ORDER BY d.nome_eleitoral ASC;
      `;

      // 3. Votos Nominais dos Deputados do Partido
      const deputyVotes = await db`
        SELECT 
          dv.id AS vote_id,
          dv.deputado_id,
          dv.sigla_partido,
          dv.voto_original,
          d.nome_eleitoral AS deputado_nome,
          vs.id AS vote_session_id,
          vs.data_hora AS session_date,
          vs.descricao AS session_description,
          p.id AS proposicao_id,
          p.numero AS proposicao_numero,
          p.ano AS proposicao_ano,
          p.sigla_tipo AS proposicao_tipo,
          p.titulo AS proposicao_titulo,
          p.ementa AS proposicao_ementa,
          p.url_camara
        FROM deputy_votes dv
        JOIN deputies d ON d.id = dv.deputado_id
        JOIN vote_sessions vs ON vs.id = dv.votacao_id
        JOIN propositions p ON p.id = vs.proposicao_id
        WHERE dv.sigla_partido = ${party.sigla}
        ORDER BY vs.data_hora DESC;
      `;

      return {
        party,
        deputies,
        politicians: deputies, // Suporte para templates existentes
        deputyVotes,
        politicianVotes: deputyVotes, // Suporte para templates existentes
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Partido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar detalhes do partido:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar detalhes do partido." },
      { status: 500 }
    );
  }
}
