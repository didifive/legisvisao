"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FaChevronRight,
  FaUsers,
  FaVoteYea,
  FaExternalLinkAlt,
  FaLandmark,
  FaUserTie,
  FaMapMarkerAlt,
  FaSearch,
  FaTimes,
  FaFilter,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type { Party, Deputy } from "@/types/db";

interface Props {
  party: Party;
  deputies: Deputy[];
  deputyVotes: Array<{
    vote_id: number;
    deputado_id: number;
    sigla_partido: string;
    voto_original: string;
    deputado_nome: string;
    vote_session_id: string;
    session_date: string;
    proposicao_id: number;
    proposicao_titulo: string;
    proposicao_ementa: string;
    url_camara: string | null;
  }>;
}

export default function PartyDetailsClient({
  party,
  deputies,
  deputyVotes = [],
}: Props) {
  const [deputySearch, setDeputySearch] = useState("");
  const [selectedUf, setSelectedUf] = useState("ALL");
  const [propSearch, setPropSearch] = useState("");
  const [visiblePropCount, setVisiblePropCount] = useState(10);
  const PAGE_SIZE = 10;

  // URL do logotipo do partido com fallback para padrão oficial da Câmara
  const partyLogoUrl = useMemo(() => {
    if (party.logo_url) return party.logo_url;
    const cleanSigla = (party.sigla || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    return cleanSigla ? `https://www.camara.leg.br/internet/Deputado/img/partidos/${cleanSigla}.gif` : null;
  }, [party]);

  // UFs disponíveis na bancada do partido
  const availableUfs = useMemo(() => {
    const ufSet = new Set<string>();
    for (const d of deputies) {
      if (d.sigla_uf) ufSet.add(d.sigla_uf);
    }
    return Array.from(ufSet).sort();
  }, [deputies]);

  // Filtragem da bancada de deputados
  const filteredDeputies = useMemo(() => {
    return deputies.filter((d) => {
      if (selectedUf !== "ALL" && d.sigla_uf !== selectedUf) {
        return false;
      }
      if (deputySearch.trim()) {
        const q = deputySearch.toLowerCase().trim();
        const matchNome = (d.nome || "").toLowerCase().includes(q);
        const matchEleitoral = (d.nome_eleitoral || "").toLowerCase().includes(q);
        if (!matchNome && !matchEleitoral) return false;
      }
      return true;
    });
  }, [deputies, deputySearch, selectedUf]);

  // Agrupar e ordenar proposições com votos nominais por data cronológica decrescente
  const propositionsWithVotes = useMemo(() => {
    const propMap = new Map<number, {
      proposicao_id: number;
      proposicao_titulo: string;
      proposicao_ementa: string;
      url_camara: string | null;
      latest_session_date: string | null;
      votes: Array<{ deputado_nome: string; voto_original: string }>;
    }>();

    for (const pv of deputyVotes) {
      if (!propMap.has(pv.proposicao_id)) {
        propMap.set(pv.proposicao_id, {
          proposicao_id: pv.proposicao_id,
          proposicao_titulo: pv.proposicao_titulo ?? "Sem título",
          proposicao_ementa: pv.proposicao_ementa,
          url_camara: pv.url_camara,
          latest_session_date: pv.session_date ?? null,
          votes: [],
        });
      }
      const item = propMap.get(pv.proposicao_id)!;
      if (pv.session_date) {
        if (!item.latest_session_date || new Date(pv.session_date).getTime() > new Date(item.latest_session_date).getTime()) {
          item.latest_session_date = pv.session_date;
        }
      }
      item.votes.push({
        deputado_nome: pv.deputado_nome,
        voto_original: pv.voto_original,
      });
    }

    return Array.from(propMap.values()).sort((a, b) => {
      const timeA = a.latest_session_date ? new Date(a.latest_session_date).getTime() : 0;
      const timeB = b.latest_session_date ? new Date(b.latest_session_date).getTime() : 0;
      return timeB - timeA || b.proposicao_id - a.proposicao_id;
    });
  }, [deputyVotes]);

  // Filtragem de proposições por texto
  const filteredPropositions = useMemo(() => {
    if (!propSearch.trim()) return propositionsWithVotes;
    const q = propSearch.toLowerCase().trim();
    return propositionsWithVotes.filter((p) => {
      const matchTitulo = (p.proposicao_titulo || "").toLowerCase().includes(q);
      const matchEmenta = (p.proposicao_ementa || "").toLowerCase().includes(q);
      return matchTitulo || matchEmenta;
    });
  }, [propositionsWithVotes, propSearch]);

  const displayedPropositions = useMemo(() => {
    return filteredPropositions.slice(0, visiblePropCount);
  }, [filteredPropositions, visiblePropCount]);

  function handlePropSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPropSearch(e.target.value);
    setVisiblePropCount(PAGE_SIZE);
  }

  function handleClearPropSearch() {
    setPropSearch("");
    setVisiblePropCount(PAGE_SIZE);
  }

  function handleLoadMoreProps() {
    setVisiblePropCount((prev) => prev + PAGE_SIZE);
  }

  function handleClearDeputyFilters() {
    setDeputySearch("");
    setSelectedUf("ALL");
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Navegação Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-smooth">
          Início
        </Link>
        <FaChevronRight className="w-2.5 h-2.5" />
        <Link href="/afinidade" className="hover:text-primary transition-smooth">
          Afinidade
        </Link>
        <FaChevronRight className="w-2.5 h-2.5" />
        <span className="text-foreground font-semibold">{party.sigla}</span>
      </div>

      {/* Header do Partido */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Logo Oficial do Partido */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white/90 dark:bg-muted border border-border shrink-0 flex items-center justify-center p-2 shadow-soft">
            {partyLogoUrl ? (
              <img
                src={partyLogoUrl}
                alt={`Logotipo oficial do partido ${party.sigla}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              style={{ display: partyLogoUrl ? "none" : "flex" }}
              className="w-full h-full items-center justify-center font-black text-lg sm:text-xl text-primary"
            >
              {party.sigla}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <FaLandmark className="w-3 h-3" />
              <span>Partido Político na Câmara</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
              <span>{party.nome}</span>
              <span className="text-sm font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded">
                {party.sigla}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bancada com <strong>{deputies.length}</strong> {deputies.length === 1 ? "deputado federal em exercício" : "deputados federais em exercício"}.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Deputados Federais */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaUsers className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Deputados Federais da Bancada ({deputies.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Exibindo <strong>{filteredDeputies.length}</strong> de <strong>{deputies.length}</strong> {deputies.length === 1 ? "deputado" : "deputados"}
          </span>
        </div>

        {deputies.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum deputado federal cadastrado para esta legenda.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Barra de Filtros da Bancada */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 sm:p-4 rounded-xl bg-card border border-border shadow-soft">
              {/* Busca por Nome */}
              <div className="relative sm:col-span-2">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar parlamentar por nome..."
                  value={deputySearch}
                  onChange={(e) => setDeputySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-smooth"
                />
                {deputySearch && (
                  <button
                    type="button"
                    onClick={() => setDeputySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-smooth"
                    title="Limpar busca"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filtro por UF */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedUf}
                    onChange={(e) => setSelectedUf(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-smooth cursor-pointer"
                  >
                    <option value="ALL">Todos os Estados ({availableUfs.length} UFs)</option>
                    {availableUfs.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                {(deputySearch || selectedUf !== "ALL") && (
                  <button
                    type="button"
                    onClick={handleClearDeputyFilters}
                    className="px-2.5 py-2 rounded-lg bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-smooth shrink-0"
                    title="Limpar filtros"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Grid de Deputados */}
            {filteredDeputies.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Nenhum parlamentar encontrado para os filtros selecionados.
                </p>
                <button
                  type="button"
                  onClick={handleClearDeputyFilters}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  Limpar filtros de parlamentares
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredDeputies.map((d) => (
                  <Link
                    key={d.id}
                    href={`/politicos/${d.id}`}
                    className="p-3.5 rounded-xl bg-card border border-border shadow-soft hover:border-primary/50 transition-smooth flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <FaUserTie className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-smooth">
                          {d.nome_eleitoral || d.nome}
                        </h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <FaMapMarkerAlt className="w-2.5 h-2.5 text-primary" />
                          <span>{d.sigla_uf}</span>
                        </span>
                      </div>
                    </div>
                    <FaChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-smooth shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Histórico de Votos das Proposições */}
      {propositionsWithVotes.length > 0 && (
        <section className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FaVoteYea className="text-primary w-5 h-5" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Posicionamentos Registrados nas Propostas de Lei
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Exibindo <strong>{displayedPropositions.length}</strong> de <strong>{filteredPropositions.length}</strong> {filteredPropositions.length === 1 ? "proposta" : "propostas"}
            </span>
          </div>

          <div className="space-y-4">
            {/* Barra de Busca de Proposições */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-card border border-border shadow-soft">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar matéria votada por título ou ementa..."
                  value={propSearch}
                  onChange={handlePropSearchChange}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-smooth"
                />
                {propSearch && (
                  <button
                    type="button"
                    onClick={handleClearPropSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-smooth"
                    title="Limpar busca"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista Filtrada de Proposições */}
            {filteredPropositions.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Nenhuma proposta encontrada para o termo &ldquo;{propSearch}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={handleClearPropSearch}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  Limpar busca de propostas
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {displayedPropositions.map((p) => (
                    <div
                      key={p.proposicao_id}
                      className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          href={`/projetos/${p.proposicao_id}`}
                          className="text-base font-bold text-foreground hover:text-primary transition-smooth flex items-center gap-1.5"
                        >
                          <span>{p.proposicao_titulo}</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5 text-muted-foreground" />
                        </Link>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {p.proposicao_ementa}
                      </p>

                      {/* Votos dos deputados nesta proposta */}
                      <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                        {p.votes.map((v, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-muted text-foreground"
                          >
                            <strong className="font-semibold">{v.deputado_nome}:</strong>
                            <span className="font-bold text-primary">{v.voto_original}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão de Paginação Incremental nas Proposições */}
                {visiblePropCount < filteredPropositions.length && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={handleLoadMoreProps}
                      className="w-full sm:w-auto font-bold shadow-soft"
                    >
                      Ver mais 10 propostas ({filteredPropositions.length - visiblePropCount} restantes)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
