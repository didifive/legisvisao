import { db } from "@/lib/db";
import { Proposition, VoteSession } from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propId = Number.parseInt(id, 10);

    if (Number.isNaN(propId)) {
      return NextResponse.json(
        { error: "ID de proposição inválido." },
        { status: 400 }
      );
    }

    const cacheKey = `proposition_detail_${propId}`;

    const data = await withServerCache(cacheKey, async () => {
      // 1. Buscar proposição
      const propsResult = await db<Proposition[]>`
        SELECT * FROM propositions WHERE id = ${propId} LIMIT 1;
      `;

      if (propsResult.length === 0) {
        return null;
      }

      const proposition = propsResult[0];

      // 2. Buscar sessões de votação
      const sessions = await db<VoteSession[]>`
        SELECT * FROM vote_sessions
        WHERE proposicao_id = ${propId}
        ORDER BY data_hora DESC;
      `;

      const sessionIds = sessions.map((s) => s.id);

      // 3. Buscar votos nominais dos deputados
      let votes: Array<{
        id: number;
        votacao_id: string;
        deputado_id: number;
        sigla_partido: string;
        voto_original: string;
        deputado_nome: string;
        deputado_uf: string;
        deputado_foto: string | null;
      }> = [];

      if (sessionIds.length > 0) {
        votes = await db`
          SELECT 
            dv.id,
            dv.votacao_id,
            dv.deputado_id,
            dv.sigla_partido,
            dv.voto_original,
            d.nome_eleitoral AS deputado_nome,
            d.sigla_uf AS deputado_uf,
            d.url_foto AS deputado_foto
          FROM deputy_votes dv
          JOIN deputies d ON d.id = dv.deputado_id
          WHERE dv.votacao_id = ANY(${sessionIds})
          ORDER BY d.nome_eleitoral ASC;
        `;
      }

      return {
        proposition,
        project: proposition, // Para retrocompatibilidade de templates
        sessions,
        votes,
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Proposição não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/propositions/[id]:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar detalhes da proposição." },
      { status: 500 }
    );
  }
}
