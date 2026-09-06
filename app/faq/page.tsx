"use client";

import { useEffect, useState } from "react";
import { FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";
import { useSystemStatus } from "@/app/components/SystemStatusProvider";
import { urls } from "@/lib/urls";
import { SyncSource } from "./types";
import { SyncSourcesPanel } from "./components/SyncSourcesPanel";
import { CivicGuideSection } from "./components/CivicGuideSection";
import { MethodologySection } from "./components/MethodologySection";
import { AiTransparencySection } from "./components/AiTransparencySection";
import { SecurityPrivacySection } from "./components/SecurityPrivacySection";

export default function FAQPage() {
  const { isReady, isLoading: isStatusLoading } = useSystemStatus();
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    async function loadStatus() {
      try {
        const res = await fetch("/api/sync-status");
        if (res.ok) {
          const data = await res.json();
          const list = data.sources || (data.source ? [data.source] : []);
          setSources(list);
        }
      } catch (err) {
        console.error("Erro ao buscar status das fontes:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* 1. CABEÇALHO */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          FAQ e Fontes Oficiais
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Entenda a metodologia do <strong>LegisVisão</strong>, de onde vêm os dados públicos
          e como funciona o cálculo determinístico de afinidade legislativa.
        </p>
      </div>

      {/* Aviso Amigável para o Visitante */}
      {!isStatusLoading && !isReady && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-foreground space-y-3 shadow-soft animate-fade-in">
          <div className="flex items-center gap-2.5 font-bold text-amber-900 dark:text-amber-300 text-base">
            <FaExclamationTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Aviso: Dados da Câmara em Processo de Ingestão</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            As proposições legislativas e votações nominais estão sendo carregadas através da API de Dados Abertos da Câmara dos Deputados. Caso o conteúdo ainda não apareça no simulador, execute a sincronização ou consulte o status no painel abaixo:
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <a
              href={urls.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary/90 transition-smooth"
            >
              <span>Falar com Luis Zancanela (zancanela.dev.br)</span>
              <FaExternalLinkAlt className="w-2.5 h-2.5" />
            </a>
            <a
              href={`mailto:${urls.email}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted text-xs font-medium transition-smooth"
            >
              <span>{urls.email}</span>
            </a>
          </div>
        </div>
      )}

      {/* 2. PAINEL DE FONTES OFICIAIS */}
      <SyncSourcesPanel sources={sources} loading={loading} isClient={isClient} />

      {/* 3 & 4. FONTE DE VERDADE E GUIA CÍVICO */}
      <CivicGuideSection />

      {/* 5 & 6. METODOLOGIA E MÚLTIPLAS VOTAÇÕES */}
      <MethodologySection />

      {/* 7 & 8. INTELIGÊNCIA ARTIFICIAL E NEUTRALIDADE */}
      <AiTransparencySection />

      {/* 9 & 10. PRIVACIDADE LOCAL-FIRST E INSPIRAÇÕES */}
      <SecurityPrivacySection />
    </main>
  );
}
