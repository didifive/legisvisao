import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PropositionSecondarySessions } from "../PropositionSecondarySessions";

describe("PropositionSecondarySessions - Filtragem Estrita de Sessões Nominais", () => {
  const mockOnVote = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renderiza apenas sessões que possuem votos nominais em deputy_votes e oculta simbólicas", async () => {
    // Simula a situação da PEC 18/2025: 5 sessões no total, mas apenas a primária e a sessão 2 têm votos nominais
    const mockDetailData = {
      sessions: [
        {
          id: "2500080-1",
          proposicao_id: 2500080,
          descricao: "Sessão Primária de Mérito",
          total_sim: 350,
          total_nao: 100,
        },
        {
          id: "2500080-2",
          proposicao_id: 2500080,
          titulo_amigavel: "Destaque 1 - Regime de Previdência",
          descricao: "Votação nominal do Destaque 1",
          total_sim: 200,
          total_nao: 150,
        },
        {
          id: "2500080-3",
          proposicao_id: 2500080,
          titulo_amigavel: "Emenda Simbólica 2",
          descricao: "Votação simbólica da Emenda 2",
          total_sim: 10,
          total_nao: 5,
        },
        {
          id: "2500080-4",
          proposicao_id: 2500080,
          titulo_amigavel: "Requerimento Simbólico 3",
          descricao: "Votação simbólica de requerimento",
          total_sim: 0,
          total_nao: 0,
        },
        {
          id: "2500080-5",
          proposicao_id: 2500080,
          titulo_amigavel: "Destaque Simbólico 4",
          descricao: "Votação simbólica sem votos de deputados",
          total_sim: 100,
          total_nao: 20,
        },
      ],
      // Apenas a sessão 1 e a sessão 2 possuem votos de deputados registrados
      votes: [
        { votacao_id: "2500080-1", deputado_id: 1, voto_original: "Sim" },
        { votacao_id: "2500080-2", deputado_id: 1, voto_original: "Sim" },
        { votacao_id: "2500080-2", deputado_id: 2, voto_original: "Não" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDetailData,
    } as Response);

    render(
      <PropositionSecondarySessions
        propositionId={2500080}
        primarySessionId="2500080-1"
        totalNominalSessions={2}
        granularAnswers={{}}
        onVote={mockOnVote}
      />
    );

    // Botão expansor indicando que existe 1 seção nominal adicional (2 total - 1 primária = 1)
    const expandBtn = screen.getByRole("button", {
      name: /Ver outras seções votadas \(1\)/i,
    });
    expect(expandBtn).toBeDefined();

    // Expande o acordeão
    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Destaque 1 - Regime de Previdência")
      ).toBeDefined();
    });

    // Garante que as 3 sessões simbólicas NÃO são renderizadas
    expect(screen.queryByText("Emenda Simbólica 2")).toBeNull();
    expect(screen.queryByText("Requerimento Simbólico 3")).toBeNull();
    expect(screen.queryByText("Destaque Simbólico 4")).toBeNull();

    // Vota "CONCORDO" na sessão 2
    const concordoBtn = screen.getByRole("button", { name: /CONCORDO/i });
    fireEvent.click(concordoBtn);

    expect(mockOnVote).toHaveBeenCalledWith("2500080-2", "CONCORDO");
  });

  it("não exibe o componente se não existirem sessões secundárias com votos nominais", () => {
    const { container } = render(
      <PropositionSecondarySessions
        propositionId={12345}
        primarySessionId="12345-1"
        totalNominalSessions={1}
        granularAnswers={{}}
        onVote={mockOnVote}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("exibe o texto formatado adequadamente no modo de revisão com contagem de opinadas", () => {
    // 8 sessões secundárias estimadas, 2 opinadas
    render(
      <PropositionSecondarySessions
        propositionId={2500080}
        primarySessionId="2500080-1"
        totalNominalSessions={9}
        nominalSessionIds={["2500080-1", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]}
        isReviewMode
        granularAnswers={{
          s1: "CONCORDO",
          s2: "DISCORDO",
        }}
        onVote={mockOnVote}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /Ver outras seções \(8 • 2 opinadas\)/i,
      })
    ).toBeDefined();
  });

  it("exibe '1 opinada' no singular quando apenas uma sessão secundária foi opinada", () => {
    render(
      <PropositionSecondarySessions
        propositionId={2500080}
        primarySessionId="2500080-1"
        totalNominalSessions={9}
        nominalSessionIds={["2500080-1", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]}
        isReviewMode
        granularAnswers={{
          s1: "CONCORDO",
        }}
        onVote={mockOnVote}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /Ver outras seções \(8 • 1 opinada\)/i,
      })
    ).toBeDefined();
  });

  it("exibe 'todas opinadas' quando todas as sessões secundárias foram opinadas", () => {
    render(
      <PropositionSecondarySessions
        propositionId={2500080}
        primarySessionId="2500080-1"
        totalNominalSessions={3}
        nominalSessionIds={["2500080-1", "s1", "s2"]}
        isReviewMode
        granularAnswers={{
          s1: "CONCORDO",
          s2: "DISCORDO",
        }}
        onVote={mockOnVote}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /Ver outras seções \(2 • todas opinadas\)/i,
      })
    ).toBeDefined();
  });
});
