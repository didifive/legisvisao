"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaUserTie,
  FaLandmark,
  FaVoteYea,
  FaCalendarAlt,
  FaHistory,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type {
  PoliticianDetail,
  Mandate,
  PartyHistoryRow,
  PoliticianVoteRow,
} from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";

interface PoliticianDetailsClientProps {
  politician: PoliticianDetail;
  mandates: Mandate[];
  partyHistory: PartyHistoryRow[];
  votes: PoliticianVoteRow[];
}

export default function PoliticianDetailsClient({
  politician,
  mandates,
  partyHistory,
  votes,
}: PoliticianDetailsClientProps) {
  const isSenator = politician.type === "SENATOR";
  const cargoLabel = isSenator ? "Senador da República" : "Deputado Federal";
  const sourceLabel = politician.source === "CAMARA" ? "Câmara dos Deputados" : "Senado Federal";
  const officialProfileUrl =
    politician.source === "CAMARA"
      ? `https://www.camara.leg.br/deputados/${politician.external_id}`
      : `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${politician.external_id}`;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb e Ação de Retorno */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/afinidade" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Afinidade</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{politician.name}</span>
      </div>

      {/* Header do Parlamentar */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Foto Oficial */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
            {politician.photo_url ? (
              <Image
                src={politician.photo_url}
                alt={politician.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <FaUserTie className="w-10 h-10 text-muted-foreground/50" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <FaLandmark className="w-3 h-3" />
              {cargoLabel} ({sourceLabel})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {politician.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              {politician.party_sigla && (
                <span className="font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded">
                  {politician.party_sigla}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt className="w-3 h-3 text-primary" />
                {politician.state}
              </span>
              {politician.email && (
                <a
                  href={`mailto:${politician.email}`}
                  className="flex items-center gap-1 hover:text-primary transition-smooth"
                >
                  <FaEnvelope className="w-3 h-3" />
                  {politician.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" href={officialProfileUrl} target="_blank" rel="noopener noreferrer">
            <span>Perfil Oficial</span>
            <FaExternalLinkAlt className="w-2.5 h-2.5 ml-1" />
          </Button>
          <Button variant="hero" size="sm" href="/afinidade">
            Voltar à Afinidade
          </Button>
        </div>
      </div>

      {/* 1. SEÇÃO DE VOTOS NOMINAIS REGISTRADOS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaVoteYea className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Votos Nominais Registrados ({votes.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Fonte: Dados Abertos Oficiais
          </span>
        </div>

        {votes.length === 0 ? (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
            Nenhuma deliberação nominal registrada para este parlamentar no acervo atual.
          </div>
        ) : (
          <div className="space-y-3">
            {votes.map((v) => {
              const norm = normalizeVote(v.vote_original);
              const isSim = norm === "SIM";
              const isNao = norm === "NÃO";

              return (
                <div
                  key={v.vote_id}
                  className="p-4 sm:p-5 rounded-xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-smooth hover:border-primary/40"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground hover:text-primary transition-smooth">
                        {v.project_title}
                      </span>
                      {v.party_sigla && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {v.party_sigla}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {v.house}
                      </span>
                    </div>

                    {v.project_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {v.project_description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      {v.vote_date && (
                        <span>
                          Data: {new Date(v.vote_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {v.official_url && (
                        <a
                          href={v.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <span>Ficha Oficial</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Voto Nominal Registrado */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        isSim
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isNao
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : "bg-muted text-foreground border border-border"
                      }`}
                    >
                      {isSim && <FaCheck className="w-3 h-3" />}
                      {isNao && <FaTimes className="w-3 h-3" />}
                      <span>Voto: {v.vote_original}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. SEÇÃO DE MANDATOS E HISTÓRICO PARTIDÁRIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mandatos */}
        <section className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <FaCalendarAlt className="text-primary w-4 h-4" />
            <h3 className="text-base font-bold text-foreground">
              Mandatos Registrados
            </h3>
          </div>

          {mandates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum mandato cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {mandates.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <div className="font-bold text-foreground">{m.office} ({m.house})</div>
                  <div className="text-muted-foreground">
                    Período: {m.start_date ? new Date(m.start_date).toLocaleDateString("pt-BR") : "—"} até{" "}
                    {m.end_date ? new Date(m.end_date).toLocaleDateString("pt-BR") : "Atual"}
                  </div>
                  {m.legislature_id && (
                    <div className="text-[11px] text-primary font-medium">
                      Legislatura: {m.legislature_id}ª
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Histórico Partidário */}
        <section className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <FaHistory className="text-primary w-4 h-4" />
            <h3 className="text-base font-bold text-foreground">
              Filiações Partidárias
            </h3>
          </div>

          {partyHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum histórico partidário cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {partyHistory.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                  <div className="font-bold text-foreground">
                    {h.party_sigla} {h.party_name ? `— ${h.party_name}` : ""}
                  </div>
                  <div className="text-muted-foreground">
                    Início: {h.start_date ? new Date(h.start_date).toLocaleDateString("pt-BR") : "—"} •{" "}
                    {h.end_date ? `Fim: ${new Date(h.end_date).toLocaleDateString("pt-BR")}` : "Atual"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
