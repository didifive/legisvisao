import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PoliticianDetailsClient from "../[id]/PoliticianDetailsClient";
import type { Deputy, DeputyVoteDetail } from "@/types/db";

const mockDeputy: Deputy & { party_name?: string } = {
  id: 12345,
  nome: "Deputado Exemplo da Silva",
  nome_eleitoral: "Deputado Exemplo",
  sigla_partido: "PART",
  sigla_uf: "SP",
  url_foto: null,
  email: "deputado.exemplo@camara.leg.br",
  situacao: "Exercício",
  legislatura: 57,
  is_active: true,
};

function createMockVotes(count: number): DeputyVoteDetail[] {
  const votes: DeputyVoteDetail[] = [];
  for (let i = 1; i <= count; i++) {
    votes.push({
      vote_id: i,
      votacao_id: `sess-${i}`,
      voto_original: i % 2 === 0 ? "Sim" : "Não",
      data_hora: new Date(2024, 0, i, 14, 0, 0).toISOString(),
      proposicao_id: 1000 + i,
      titulo: `PL ${1000 + i}/2024`,
      ementa: `Ementa do projeto número ${1000 + i} sobre Educação e Saúde`,
      tema: i % 2 === 0 ? "Educação" : "Saúde",
      url_camara: `https://camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${1000 + i}`,
      resultado: "Aprovado",
      vote_description: `Votação do PL ${1000 + i}`,
    });
  }
  return votes;
}

describe("PoliticianDetailsClient - Paginação, Busca e Ordenação", () => {
  it("renderiza cabeçalho do político e lista inicial paginada (10 itens)", () => {
    const votes = createMockVotes(25);
    render(<PoliticianDetailsClient deputy={mockDeputy} votes={votes} />);

    expect(screen.getByRole("heading", { name: "Deputado Exemplo" })).toBeDefined();
    expect(screen.getByText("PART")).toBeDefined();
    expect(screen.getByText("SP")).toBeDefined();

    // Indicador de progresso
    expect(screen.getByText(/Exibindo/)).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();

    // Botão de carregar mais
    const loadMoreBtn = screen.getByRole("button", { name: /Ver mais 10 propostas/i });
    expect(loadMoreBtn).toBeDefined();
  });

  it("carrega mais 10 propostas ao clicar no botão de paginação incremental", () => {
    const votes = createMockVotes(25);
    render(<PoliticianDetailsClient deputy={mockDeputy} votes={votes} />);

    const loadMoreBtn = screen.getByRole("button", { name: /Ver mais 10 propostas/i });
    fireEvent.click(loadMoreBtn);

    // Agora deve exibir 20 de 25
    expect(screen.getByText("20")).toBeDefined();
    expect(screen.getByText("25")).toBeDefined();

    // Clica novamente para carregar os 5 restantes
    const loadMoreBtn2 = screen.getByRole("button", { name: /Ver mais 10 propostas/i });
    fireEvent.click(loadMoreBtn2);

    // Todos os 25 carregados, botão deve sumir
    expect(screen.queryByRole("button", { name: /Ver mais 10 propostas/i })).toBeNull();
  });

  it("filtra proposições por busca textual e reseta paginação", () => {
    const votes = createMockVotes(25);
    render(<PoliticianDetailsClient deputy={mockDeputy} votes={votes} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por título/i);
    fireEvent.change(searchInput, { target: { value: "PL 1005" } });

    expect(screen.getByText("PL 1005/2024")).toBeDefined();
    expect(screen.queryByText("PL 1006/2024")).toBeNull();

    // Limpar busca
    const clearBtn = screen.getByTitle("Limpar busca");
    fireEvent.click(clearBtn);

    expect((searchInput as HTMLInputElement).value).toBe("");
    // Na ordenação decrescente, o item mais recente na página inicial é o 1025
    expect(screen.getByText("PL 1025/2024")).toBeDefined();
  });

  it("exibe mensagem amigável quando nenhuma proposição corresponde à busca", () => {
    const votes = createMockVotes(15);
    render(<PoliticianDetailsClient deputy={mockDeputy} votes={votes} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por título/i);
    fireEvent.change(searchInput, { target: { value: "TermoInexistenteXYZ" } });

    expect(screen.getByText(/Nenhuma proposição encontrada para o termo de busca/i)).toBeDefined();
  });
});
