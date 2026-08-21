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
});
