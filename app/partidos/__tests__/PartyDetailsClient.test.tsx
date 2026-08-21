import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PartyDetailsClient from "../[id]/PartyDetailsClient";
import type { Party, Deputy } from "@/types/db";

const mockParty: Party = {
  id: 10,
  sigla: "PART",
  nome: "Partido Modelo Nacional",
  logo_url: null,
  total_membros: 5,
};

const mockDeputies: Deputy[] = [
  {
    id: 1,
    nome: "Ana Pereira Silva",
    nome_eleitoral: "Ana Silva",
    sigla_partido: "PART",
    sigla_uf: "SP",
    url_foto: null,
    email: null,
    situacao: "Exercício",
    legislatura: 57,
    is_active: true,
  },
  {
    id: 2,
    nome: "Bruno Lima Costa",
    nome_eleitoral: "Bruno Costa",
    sigla_partido: "PART",
    sigla_uf: "RJ",
    url_foto: null,
    email: null,
    situacao: "Exercício",
    legislatura: 57,
    is_active: true,
  },
  {
    id: 3,
    nome: "Carlos Eduardo Souza",
    nome_eleitoral: "Carlos Souza",
    sigla_partido: "PART",
    sigla_uf: "SP",
    url_foto: null,
    email: null,
    situacao: "Exercício",
    legislatura: 57,
    is_active: true,
  },
  {
    id: 4,
    nome: "Daniela Ramos",
    nome_eleitoral: "Daniela Ramos",
    sigla_partido: "PART",
    sigla_uf: "MG",
    url_foto: null,
    email: null,
    situacao: "Exercício",
    legislatura: 57,
    is_active: true,
  },
];

function createMockPartyVotes(count: number) {
  const votes = [];
  for (let i = 1; i <= count; i++) {
    const month = String((i % 12) + 1).padStart(2, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    votes.push({
      vote_id: i,
      deputado_id: (i % 4) + 1,
      sigla_partido: "PART",
      voto_original: "Sim",
      deputado_nome: `Deputado ${(i % 4) + 1}`,
      vote_session_id: `sess-${i}`,
      session_date: `2024-${month}-${day}T14:00:00Z`,
      proposicao_id: 2000 + i,
      proposicao_titulo: `PEC ${2000 + i}/2024`,
      proposicao_ementa: `Ementa da PEC número ${2000 + i} sobre Economia e Tributação`,
      url_camara: `https://camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${2000 + i}`,
    });
  }
  return votes;
}

describe("PartyDetailsClient - Bancada e Proposições", () => {
  it("renderiza cabeçalho do partido e lista de deputados", () => {
    const votes = createMockPartyVotes(5);
    render(
      <PartyDetailsClient
        party={mockParty}
        deputies={mockDeputies}
        deputyVotes={votes}
      />
    );

    expect(screen.getByText("Partido Modelo Nacional")).toBeDefined();
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("Bruno Costa")).toBeDefined();
    expect(screen.getByText("Carlos Souza")).toBeDefined();
    expect(screen.getByText("Daniela Ramos")).toBeDefined();
  });

  it("filtra deputados da bancada por Estado (UF)", () => {
    const votes = createMockPartyVotes(5);
    render(
      <PartyDetailsClient
        party={mockParty}
        deputies={mockDeputies}
        deputyVotes={votes}
      />
    );

    const ufSelect = screen.getByRole("combobox");
    fireEvent.change(ufSelect, { target: { value: "SP" } });

    // Devem aparecer apenas deputados de SP (Ana Silva e Carlos Souza)
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("Carlos Souza")).toBeDefined();
    expect(screen.queryByText("Bruno Costa")).toBeNull();
    expect(screen.queryByText("Daniela Ramos")).toBeNull();
  });

  it("filtra deputados da bancada por busca textual de nome", () => {
    const votes = createMockPartyVotes(5);
    render(
      <PartyDetailsClient
        party={mockParty}
        deputies={mockDeputies}
        deputyVotes={votes}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar parlamentar por nome/i);
    fireEvent.change(searchInput, { target: { value: "Daniela" } });

    expect(screen.getByText("Daniela Ramos")).toBeDefined();
    expect(screen.queryByText("Ana Silva")).toBeNull();
    expect(screen.queryByText("Bruno Costa")).toBeNull();
  });

  it("realiza paginação incremental nas propostas votadas pela bancada", () => {
    const votes = createMockPartyVotes(22);
    render(
      <PartyDetailsClient
        party={mockParty}
        deputies={mockDeputies}
        deputyVotes={votes}
      />
    );

    // Botão de carregar mais propostas
    const loadMoreBtn = screen.getByRole("button", { name: /Ver mais 10 propostas/i });
    expect(loadMoreBtn).toBeDefined();

    fireEvent.click(loadMoreBtn);

    // Clica novamente para carregar o restante
    const loadMoreBtn2 = screen.getByRole("button", { name: /Ver mais 10 propostas/i });
    fireEvent.click(loadMoreBtn2);

    expect(screen.queryByRole("button", { name: /Ver mais 10 propostas/i })).toBeNull();
  });

  it("filtra propostas do partido por busca de texto", () => {
    const votes = createMockPartyVotes(15);
    render(
      <PartyDetailsClient
        party={mockParty}
        deputies={mockDeputies}
        deputyVotes={votes}
      />
    );

    const searchPropInput = screen.getByPlaceholderText(/Buscar matéria votada por título ou ementa/i);
    fireEvent.change(searchPropInput, { target: { value: "PEC 2005" } });

    expect(screen.getByText("PEC 2005/2024")).toBeDefined();
    expect(screen.queryByText("PEC 2006/2024")).toBeNull();
  });
});
