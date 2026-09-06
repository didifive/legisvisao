import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectDetailsClient from "../[id]/ProjectDetailsClient";
import type { Proposition, VoteSession } from "@/types/db";
import { getStoredGranularAnswers } from "@/lib/storage";

const mockProposition: Proposition = {
  id: 2500080,
  sigla_tipo: "PEC",
  numero: 18,
  ano: 2025,
  titulo: "PEC 18/2025",
  ementa: "Altera o regime previdenciário e fiscal.",
  ementa_detalhada: "Altera dispositivos da Constituição Federal.",
  tema: "Previdência",
  url_inteiro_teor: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2500080",
  url_camara: "https://www.camara.leg.br",
  data_apresentacao: "2025-01-01",
  ultimo_status: "Aprovado",
  resumo_geral: "Resumo explicativo da PEC 18/2025.",
  last_updated_at: new Date().toISOString(),
};

const mockSessions: VoteSession[] = [
  {
    id: "2500080-1",
    proposicao_id: 2500080,
    data_hora: "2025-02-01T15:00:00Z",
    descricao: "Votação em primeiro turno da PEC 18/2025",
    sigla_orgao: "PLEN",
    tipo_deliberacao: "MERITO",
    titulo_amigavel: "Texto-base da PEC 18/2025",
    resumo_simplificado: "Votação do mérito constitucional.",
    pergunta_cidadao: "Você é a favor das alterações na previdência?",
    resultado: "Aprovada",
  },
  {
    id: "2500080-2",
    proposicao_id: 2500080,
    data_hora: "2025-02-02T16:00:00Z",
    descricao: "Votação simbólica de emenda supressiva",
    sigla_orgao: "PLEN",
    tipo_deliberacao: "EMENDA",
    titulo_amigavel: "Emenda Simbólica de Ajuste",
    resumo_simplificado: "Emenda ajustada por acordo de lideranças.",
    resultado: "Aprovada",
  },
];

const mockVotes = [
  {
    id: 1,
    votacao_id: "2500080-1",
    deputado_id: 101,
    sigla_partido: "PL",
    voto_original: "Sim",
    deputado_nome: "Deputado A",
    deputado_uf: "SP",
    deputado_foto: null,
  },
  {
    id: 2,
    votacao_id: "2500080-1",
    deputado_id: 102,
    sigla_partido: "PT",
    voto_original: "Não",
    deputado_nome: "Deputado B",
    deputado_uf: "RJ",
    deputado_foto: null,
  },
];

describe("ProjectDetailsClient - Opinião no Card da Sessão Votada", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("não renderiza mais o bloco superior 'Sua Opinião sobre este Projeto:'", () => {
    render(
      <ProjectDetailsClient
        proposition={mockProposition}
        sessions={mockSessions}
        votes={mockVotes}
      />
    );

    expect(screen.queryByText("Sua Opinião sobre este Projeto:")).toBeNull();
  });

  it("renderiza o painel de opinião no card da sessão ativa e grava no storage granular", async () => {
    render(
      <ProjectDetailsClient
        proposition={mockProposition}
        sessions={mockSessions}
        votes={mockVotes}
      />
    );

    // O card da sessão ativa de mérito exibe o painel de opinião para a deliberação
    expect(screen.getByText("Sua Opinião nesta Deliberação:")).toBeDefined();

    const concordoBtn = screen.getByRole("button", { name: /CONCORDO/i });
    fireEvent.click(concordoBtn);

    // Verifica que o texto agora indica a opinião gravada
    await waitFor(() => {
      expect(screen.getAllByText("Você opinou: CONCORDO").length).toBeGreaterThanOrEqual(1);
    });

    // Verifica que foi salvo no storage granular para a sessão
    const granular = getStoredGranularAnswers();
    expect(granular["2500080-1"]).toBe("CONCORDO");
  });

  it("desativa a opinião para sessões simbólicas sem votos nominais de deputados", async () => {
    render(
      <ProjectDetailsClient
        proposition={mockProposition}
        sessions={mockSessions}
        votes={mockVotes}
      />
    );

    // Seleciona a sessão simbólica (2500080-2)
    const symbolicSessionTab = screen.getByRole("button", {
      name: /Emenda Simbólica de Ajuste/i,
    });
    fireEvent.click(symbolicSessionTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Votação de Opinião Desativada para esta Deliberação/i)
      ).toBeDefined();
    });

    // Não deve conter botões de CONCORDO para deliberação simbólica
    expect(screen.queryByRole("button", { name: /^CONCORDO$/i })).toBeNull();
  });
});
