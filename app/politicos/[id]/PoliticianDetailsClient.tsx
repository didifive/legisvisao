"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaUserTie,
  FaLandmark,
  FaVoteYea,
  FaHistory,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";
import type { Deputy, DeputyVoteDetail } from "@/types/db";
import { normalizeVote } from "@/lib/match/normalizeVotes";

interface PoliticianDetailsClientProps {
  deputy: Deputy & { party_name?: string | null };
  votes: DeputyVoteDetail[];
}

export default function PoliticianDetailsClient({
  deputy,
  votes,
}: PoliticianDetailsClientProps) {
  const officialProfileUrl = `https://www.camara.leg.br/deputados/${deputy.id}`;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb e Ação de Retorno */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/afinidade" className="hover:text-primary transition-smooth flex items-center gap-1">
          <FaArrowLeft className="w-3 h-3" />
          <span>Afinidade</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">{deputy.nome_eleitoral || deputy.nome}</span>
      </div>

      {/* Header do Deputado */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Foto Oficial */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
            {deputy.url_foto ? (
              <Image
                src={deputy.url_foto}
                alt={deputy.nome_eleitoral || deputy.nome}
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
              Deputado Federal (Câmara dos Deputados)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {deputy.nome_eleitoral || deputy.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              {deputy.sigla_partido && (
                <span className="font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded">
                  {deputy.sigla_partido}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt className="w-3 h-3 text-primary" />
                {deputy.sigla_uf}
              </span>
              {deputy.email && (
                <a
                  href={`mailto:${deputy.email}`}
                  className="flex items-center gap-1 hover:text-primary transition-smooth"
                >
                  <FaEnvelope className="w-3 h-3" />
                  <span>{deputy.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Link Oficial da Câmara */}
        <Button
          variant="outline"
          size="sm"
          href={officialProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gap-2 shrink-0 w-full sm:w-auto"
        >
          <FaExternalLinkAlt className="w-3 h-3 text-primary" />
          <span>Perfil na Câmara</span>
        </Button>
      </div>

      {/* Histórico Oficial de Votos Nominais */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FaVoteYea className="text-primary w-5 h-5" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Votações Nominais Registradas
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {votes.length} {votes.length === 1 ? "votação nominal registrada" : "votações nominais registradas"}
          </span>
        </div>

        {votes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <FaHistory className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">
              Nenhum voto nominal registrado para este parlamentar nas propostas catalogadas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {votes.map((v) => {
              const norm = normalizeVote(v.voto_original);
              const isSim = norm === "SIM";
              const isNao = norm === "NÃO";
              const dateFormatted = v.data_hora
                ? new Date(v.data_hora).toLocaleDateString("pt-BR")
                : null;

              return (
                <div
                  key={v.vote_id}
                  className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-smooth hover:border-border/80"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/projetos/${v.proposicao_id}`}
                        className="text-base font-extrabold text-foreground hover:text-primary transition-smooth flex items-center gap-1.5"
                      >
                        <span>{v.titulo}</span>
                        <FaExternalLinkAlt className="w-2.5 h-2.5 text-muted-foreground" />
                      </Link>

                      {v.tema && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {v.tema}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {v.ementa}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {dateFormatted && (
                        <span>Votado em: <strong>{dateFormatted}</strong></span>
                      )}
                      {v.resultado && (
                        <span>Resultado: <strong>{v.resultado}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Voto Registrado pelo Deputado */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border ${
                        isSim
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : isNao
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-muted text-foreground border-border"
                      }`}
                    >
                      {isSim && <FaCheck className="w-3.5 h-3.5" />}
                      {isNao && <FaTimes className="w-3.5 h-3.5" />}
                      <span>Votou: {v.voto_original}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
