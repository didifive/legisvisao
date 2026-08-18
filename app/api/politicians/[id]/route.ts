import { db } from "@/lib/db";
import {
  PoliticianDetail,
  PartyHistoryRow,
  PoliticianVoteRow,
  Mandate,
} from "@/types/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const politicianId = Number.parseInt(id, 10);

    if (Number.isNaN(politicianId)) {
      return NextResponse.json(
        { error: "ID de parlamentar inválido." },
        { status: 400 }
      );
    }

    const cacheKey = `politician_detail_${politicianId}`;

    const data = await withServerCache(cacheKey, async () => {
      // 1. Dados do parlamentar + foto + partido atual
      const politicianResult = await db<PoliticianDetail[]>`
        SELECT 
          p.id,
          p.source,
          p.external_id,
          p.name,
          p.type,
          p.state,
          p.photo_url,
          p.email,
          part.sigla AS party_sigla,
          part.nome AS party_name
        FROM politicians p
        LEFT JOIN politician_party_history pph
          ON p.id = pph.politician_id
         AND pph.end_date IS NULL
        LEFT JOIN political_parties part
          ON part.id = pph.party_id
        WHERE p.id = ${politicianId}
        LIMIT 1;
      `;

      if (politicianResult.length === 0) {
        return null;
      }

      const politician = politicianResult[0];

      // 2. Mandatos
      const mandates = await db<Mandate[]>`
        SELECT id, politician_id, office, house, start_date, end_date, legislature_id
        FROM mandates
        WHERE politician_id = ${politicianId}
        ORDER BY start_date DESC;
      `;

      // 3. Histórico partidário completo
      const partyHistory = await db<PartyHistoryRow[]>`
        SELECT 
          pph.id,
          pph.start_date,
          pph.end_date,
          part.sigla AS party_sigla,
          part.nome AS party_name
        FROM politician_party_history pph
        JOIN political_parties part
          ON part.id = pph.party_id
        WHERE pph.politician_id = ${politicianId}
        ORDER BY pph.start_date DESC;
      `;

      // 4. Histórico de votos nominais registrados (com partido na data da votação)
      const votes = await db<PoliticianVoteRow[]>`
        SELECT 
          pv.id AS vote_id,
          pv.vote_original,
          vs.date AS vote_date,
          vs.description AS vote_description,
          vs.result AS vote_result,
          lp.id AS project_id,
          lp.canonical_id,
          lp.title AS project_title,
          lp.description AS project_description,
          phr.house,
          phr.official_url,
          party_info.party_sigla AS party_sigla
        FROM politician_votes pv
        JOIN vote_sessions vs
          ON vs.id = pv.vote_session_id
        JOIN project_house_records phr
          ON phr.id = vs.house_record_id
        JOIN legislative_projects lp
          ON lp.id = phr.project_id
        LEFT JOIN LATERAL (
          SELECT part.sigla AS party_sigla
          FROM politician_party_history pph
          JOIN political_parties part ON part.id = pph.party_id
          WHERE pph.politician_id = pv.politician_id
          ORDER BY 
            CASE 
              WHEN pph.start_date <= vs.date::date AND (pph.end_date IS NULL OR pph.end_date >= vs.date::date) THEN 0 
              ELSE 1 
            END,
            pph.start_date DESC
          LIMIT 1
        ) party_info ON true
        WHERE pv.politician_id = ${politicianId}
        ORDER BY vs.date DESC;
      `;

      return {
        politician,
        mandates,
        partyHistory,
        votes,
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Parlamentar não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro em GET /api/politicians/[id]:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao obter detalhes do parlamentar." },
      { status: 500 }
    );
  }
}
