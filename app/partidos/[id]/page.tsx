import { notFound } from "next/navigation";
import PartyDetailsClient from "./PartyDetailsClient";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const partyId = Number(id);
  if (isNaN(partyId)) return { title: "Partido não encontrado" };

  const partyRes = await db`SELECT sigla, nome FROM political_parties WHERE id = ${partyId} LIMIT 1`;
  if (!partyRes || partyRes.length === 0) return { title: "Partido não encontrado" };

  const party = partyRes[0];
  return {
    title: `${party.sigla} - ${party.nome} | Detalhes e Votações`,
    description: `Veja os deputados, senadores e os posicionamentos de votação do ${party.nome} (${party.sigla}) nos projetos de lei oficiais.`,
  };
}

export default async function PartyPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const partyId = Number(id);

  if (isNaN(partyId)) {
    notFound();
  }

  // 1. Dados do Partido
  const partyRes = await db`
    SELECT * FROM political_parties WHERE id = ${partyId} LIMIT 1;
  `;
  if (!partyRes || partyRes.length === 0) {
    notFound();
  }
  const party = partyRes[0];

  // 2. Parlamentares Ativos
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

  // 3. Votos Nominais dos Parlamentares Filiados nos Projetos (vigentes na data da votação)
  const politicianVotes = await db`
    SELECT 
      pv.id as vote_id,
      pv.politician_id,
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
    JOIN politician_party_history pph 
      ON pph.politician_id = p.id 
     AND pph.party_id = ${partyId}
     AND pph.start_date <= vs.date::date
     AND (pph.end_date IS NULL OR pph.end_date >= vs.date::date)
    ORDER BY vs.date DESC;
  `;

  return (
    <PartyDetailsClient
      party={{ id: party.id, sigla: party.sigla, nome: party.nome }}
      politicians={politicians as any}
      politicianVotes={politicianVotes as any}
    />
  );
}
