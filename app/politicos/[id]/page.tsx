import { notFound } from "next/navigation";
import PoliticianDetailsClient from "./PoliticianDetailsClient";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import type { Deputy, DeputyVoteDetail } from "@/types/db";

export async function generateMetadata(
  props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await props.params;
  const deputyId = Number(id);
  if (isNaN(deputyId)) return { title: "Deputado não encontrado" };

  const deputyResult = await db<Array<Deputy & { party_name: string | null }>>`
    SELECT 
      d.id,
      d.nome,
      d.nome_eleitoral,
      d.sigla_partido,
      d.sigla_uf,
      d.url_foto,
      d.email,
      p.nome AS party_name
    FROM deputies d
    LEFT JOIN parties p ON p.sigla = d.sigla_partido
    WHERE d.id = ${deputyId}
    LIMIT 1;
  `;

  if (!deputyResult || deputyResult.length === 0) {
    return { title: "Deputado não encontrado" };
  }

  const dep = deputyResult[0];

  return {
    title: `${dep.nome_eleitoral || dep.nome} (Deputado Federal - ${dep.sigla_uf}) | Votos e Posicionamentos`,
    description: `Consulte o histórico oficial de votações nominais de ${dep.nome_eleitoral || dep.nome} (${dep.sigla_partido}) na Câmara dos Deputados.`,
  };
}

export default async function PoliticianPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const deputyId = Number(id);

  if (isNaN(deputyId)) {
    notFound();
  }

  // 1. Dados cadastrais do deputado
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

  if (!deputyResult || deputyResult.length === 0) {
    notFound();
  }

  const deputy = deputyResult[0];

  // 2. Histórico de votos nominais registrados na Câmara
  const votes = await db<DeputyVoteDetail[]>`
    SELECT 
      dv.id AS vote_id,
      dv.votacao_id,
      dv.voto_original,
      vs.data_hora,
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

  return (
    <PoliticianDetailsClient
      deputy={deputy}
      votes={votes}
    />
  );
}
