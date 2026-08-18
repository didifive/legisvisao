import { notFound } from "next/navigation";
import PartyDetailsClient from "./PartyDetailsClient";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import type { Party, Deputy } from "@/types/db";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const partyId = Number(id);
  if (isNaN(partyId)) return { title: "Partido não encontrado" };

  const partyRes = await db`SELECT sigla, nome FROM parties WHERE id = ${partyId} LIMIT 1`;
  if (!partyRes || partyRes.length === 0) return { title: "Partido não encontrado" };

  const party = partyRes[0];
  return {
    title: `${party.sigla} - ${party.nome} | Deputados Federais e Votações`,
    description: `Veja os deputados federais e os posicionamentos de votação do ${party.nome} (${party.sigla}) na Câmara dos Deputados.`,
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
  const partyRes = await db<Party[]>`
    SELECT * FROM parties WHERE id = ${partyId} LIMIT 1;
  `;
  if (!partyRes || partyRes.length === 0) {
    notFound();
  }
  const party = partyRes[0];

  // 2. Deputados Federais do Partido
  const deputies = await db<Deputy[]>`
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
      p.id AS proposicao_id,
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

  return (
    <PartyDetailsClient
      party={party}
      deputies={deputies}
      deputyVotes={deputyVotes as any}
    />
  );
}
