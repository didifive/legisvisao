import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RevisaoPage from "../page";

const mockPropositions = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  titulo: `PL ${100 + i}/2024`,
  sigla_tipo: "PL",
  numero: 100 + i,
  ano: 2024,
  ementa: `Ementa do projeto ${i + 1}`,
  ultimo_status: i % 2 === 0 ? "Aprovado" : "Em Tramitação",
  resumo_geral: `Resumo simplificado do projeto ${i + 1}`,
  vote_session_date: new Date(2024, 0, i + 1).toISOString(),
}));

describe("RevisaoPage - Paginação e Filtros", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Simula respostas do usuário para as 25 propostas
    const saved: Record<number, "CONCORDO" | "DISCORDO"> = {};
    for (let i = 1; i <= 25; i++) {
      saved[i] = i % 2 === 0 ? "CONCORDO" : "DISCORDO";
    }
    localStorage.setItem("legisvisao_user_opinions", JSON.stringify(saved));

    // Mock global fetch para /api/propositions
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ propositions: mockPropositions }),
    } as Response);
  });

  it("renderiza lista com paginação inicial de 10 itens e indicador de contagem", async () => {
    render(<RevisaoPage />);

    await waitFor(() => {
      expect(screen.getByText("Minhas Opiniões Registradas")).toBeDefined();
    });

    // Deve exibir 10 de 25
    expect(screen.getByText(/Exibindo/)).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getAllByText("25").length).toBeGreaterThanOrEqual(1);

    // Botão de carregar mais opiniões
    const loadMoreBtn = screen.getByRole("button", { name: /Ver mais 10 opiniões/i });
    expect(loadMoreBtn).toBeDefined();

    fireEvent.click(loadMoreBtn);

    // Agora exibe 20 de 25
    expect(screen.getByText("20")).toBeDefined();
    expect(screen.getAllByText("25").length).toBeGreaterThanOrEqual(1);
  });

  it("filtra opiniões por texto e reseta paginação", async () => {
    render(<RevisaoPage />);

    await waitFor(() => {
      expect(screen.getByText("Minhas Opiniões Registradas")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar em minhas respostas/i);
    fireEvent.change(searchInput, { target: { value: "PL 105" } });

    expect(screen.getByText("PL 105/2024")).toBeDefined();
    expect(screen.queryByText("PL 106/2024")).toBeNull();
  });

  it("renderiza votos granulares salvos diretamente e permite alterar o voto", async () => {
    localStorage.clear();
    const granularVotes: Record<string, "CONCORDO" | "DISCORDO"> = {
      "sess-1": "CONCORDO",
      "sess-2": "DISCORDO",
    };
    localStorage.setItem("legisvisao_user_granular_opinions", JSON.stringify(granularVotes));

    const customProps = [
      {
        id: 1,
        titulo: "PL 1/2024",
        sigla_tipo: "PL",
        numero: 1,
        ano: 2024,
        ementa: "Ementa 1",
        ultimo_status: "Aprovado",
        vote_session_id: "sess-1",
        is_merit: true,
      },
      {
        id: 2,
        titulo: "PL 2/2024",
        sigla_tipo: "PL",
        numero: 2,
        ano: 2024,
        ementa: "Ementa 2",
        ultimo_status: "Em Tramitação",
        vote_session_id: "sess-2",
        is_merit: true,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ propositions: customProps }),
    } as Response);

    render(<RevisaoPage />);

    await waitFor(() => {
      expect(screen.getByText("PL 1/2024")).toBeDefined();
    });

    const discordoBtn = screen.getAllByRole("button", { name: /DISCORDO/i })[0];
    fireEvent.click(discordoBtn);

    const stored = JSON.parse(localStorage.getItem("legisvisao_user_granular_opinions") || "{}");
    expect(stored["sess-1"]).toBe("DISCORDO");
  });

  it("permite remover a resposta de uma proposição", async () => {
    localStorage.clear();
    const granularVotes: Record<string, "CONCORDO" | "DISCORDO"> = {
      "sess-1": "CONCORDO",
    };
    localStorage.setItem("legisvisao_user_granular_opinions", JSON.stringify(granularVotes));

    const customProps = [
      {
        id: 1,
        titulo: "PL 1/2024",
        sigla_tipo: "PL",
        numero: 1,
        ano: 2024,
        ementa: "Ementa 1",
        ultimo_status: "Aprovado",
        vote_session_id: "sess-1",
        is_merit: true,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ propositions: customProps }),
    } as Response);

    render(<RevisaoPage />);

    await waitFor(() => {
      expect(screen.getByText("PL 1/2024")).toBeDefined();
    });

    const removerBtn = screen.getByTitle("Excluir opinião nesta deliberação");
    fireEvent.click(removerBtn);

    const stored = JSON.parse(localStorage.getItem("legisvisao_user_granular_opinions") || "{}");
    expect(stored["sess-1"]).toBeUndefined();
  });

  it("não marca a deliberação principal como opinada quando o usuário opinou apenas em sessões secundárias", async () => {
    localStorage.clear();
    // Simula voto apenas na sessão secundária 'sess-secundaria-1', mas não na principal 'sess-principal-1'
    const granularVotes: Record<string, "CONCORDO" | "DISCORDO"> = {
      "sess-secundaria-1": "CONCORDO",
    };
    localStorage.setItem("legisvisao_user_granular_opinions", JSON.stringify(granularVotes));

    const customProps = [
      {
        id: 2196833,
        titulo: "PEC 45/2019",
        sigla_tipo: "PEC",
        numero: 45,
        ano: 2019,
        ementa: "Ementa da PEC 45",
        ultimo_status: "Aprovado",
        vote_session_id: "sess-principal-1",
        is_merit: true,
        nominal_session_ids: ["sess-principal-1", "sess-secundaria-1"],
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ propositions: customProps }),
    } as Response);

    render(<RevisaoPage />);

    await waitFor(() => {
      expect(screen.getByText("PEC 45/2019")).toBeDefined();
    });

    // Na deliberação principal, NÃO deve aparecer "Você opinou: CONCORDO"
    expect(screen.queryByText(/Você opinou: CONCORDO/i)).toBeNull();
    // Deve mostrar a indicação padrão para votar: "Sua opinião nesta deliberação:"
    expect(screen.getByText("Sua opinião nesta deliberação:")).toBeDefined();
    // E não deve exibir o botão de excluir da deliberação principal
    expect(screen.queryByTitle("Excluir opinião nesta deliberação")).toBeNull();
  });
});
