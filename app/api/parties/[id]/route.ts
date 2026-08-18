import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { withServerCache } from "@/lib/server-cache";

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
        SELECT * FROM political_parties WHERE id = ${partyId} LIMIT 1;
      `;
      if (!partyRes || partyRes.length === 0) {
        return null;
      }
      const party = partyRes[0];

      // 2. Parlamentares do Partido (Deputados e Senadores com mandato ativo)
      const politicians = await db`
        SELECT 
          p.id,
          p.name,
          p.type,
          p.state,
          p.photo_url,
          p.email,
          p.source,
          m.office as mandate_office
        FROM politicians p
        INNER JOIN politician_party_history pph 
          ON p.id = pph.politician_id 
          AND pph.party_id = ${partyId} 
          AND pph.end_date IS NULL
        LEFT JOIN mandates m
          ON m.politician_id = p.id
          AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
        WHERE p.is_active = TRUE
        ORDER BY p.type ASC, p.name ASC;
      `;

      // 3. Votos Nominais dos Parlamentares Filiados nos Projetos (atribuídos diretamente à legenda)
      const politicianVotes = await db`
        SELECT 
          pv.id as vote_id,
          pv.politician_id,
          pv.party_id,
          pv.vote_original,
          p.name as politician_name,
          vs.id as vote_session_id,
          vs.date as session_date,
          vs.description as session_description,
          lp.id as project_id,
          lp.canonical_id,
          lp.number as project_number,
          lp.year as project_year,
          lp.type as project_type,
          lp.title as project_title,
          lp.description as project_description,
          phr.house,
          phr.official_url
        FROM politician_votes pv
        JOIN politicians p ON p.id = pv.politician_id
        JOIN vote_sessions vs ON vs.id = pv.vote_session_id
        JOIN project_house_records phr ON phr.id = vs.house_record_id
        JOIN legislative_projects lp ON lp.id = phr.project_id
        WHERE pv.party_id = ${partyId}
        ORDER BY vs.date DESC;
      `;

      return {
        party,
        politicians,
        politicianVotes,
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
