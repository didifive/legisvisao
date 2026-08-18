import { db } from "@/lib/db";
import { Deputy, DeputyVoteDetail } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deputyId = Number.parseInt(id, 10);

    if (Number.isNaN(deputyId)) {
      return NextResponse.json(
        { error: "ID de deputado inválido." },
        { status: 400 }
      );
    }

    const cacheKey = `deputy_detail_${deputyId}`;

    const data = await withServerCache(cacheKey, async () => {
      // 1. Dados do deputado + partido
      const deputyResult = await db<Array<Deputy & { party_name: string | null }>>`
        SELECT 
          d.id,
          d.nome,
          d.nome_eleitoral,
          d.sigla_partido,
          d.sigla_uf,
          d.url_foto,
          d.email,
          d.situacao,
          d.legislatura,
          d.is_active,
          p.nome AS party_name
        FROM deputies d
        LEFT JOIN parties p ON p.sigla = d.sigla_partido
        WHERE d.id = ${deputyId}
        LIMIT 1;
      `;

      if (deputyResult.length === 0) {
        return null;
      }

      const deputy = deputyResult[0];

      // 2. Histórico de votos nominais registrados
      const votes = await db<DeputyVoteDetail[]>`
        SELECT 
          dv.id AS vote_id,
          dv.votacao_id,
          dv.voto_original,
          vs.data_hora,
          vs.descricao AS vote_description,
          vs.resultado,
          p.id AS proposicao_id,
          p.titulo,
          p.ementa,
          p.tema,
          p.url_camara
        FROM deputy_votes dv
        JOIN vote_sessions vs ON vs.id = dv.votacao_id
        JOIN propositions p ON p.id = vs.proposicao_id
        WHERE dv.deputado_id = ${deputyId}
        ORDER BY vs.data_hora DESC;
      `;

      return {
        deputy,
        politician: deputy, // Compatibilidade com templates de visualização
        votes,
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Deputado não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/deputies/[id]:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter detalhes do deputado." },
      { status: 500 }
    );
  }
}
