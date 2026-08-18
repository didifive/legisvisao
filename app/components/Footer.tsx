"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaGithub,
  FaLinkedin,
  FaGlobe,
  FaShieldAlt,
  FaBalanceScale,
  FaQuestionCircle,
  FaExternalLinkAlt,
  FaCommentDots,
  FaDatabase,
} from "react-icons/fa";
import { urls } from "@/lib/urls";
import { getCopyRightYearsDisplay } from "@/lib/utils";
import { useSystemStatus } from "./SystemStatusProvider";

export const Footer = () => {
  const { isReady } = useSystemStatus();
  const [version, setVersion] = useState<string>("0.1.0");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [verRes, metaRes] = await Promise.all([
          fetch("/api/version").catch(() => null),
          fetch("/api/metadata").catch(() => null),
        ]);

        if (verRes && verRes.ok) {
          const vData = await verRes.json();
          if (vData?.version) setVersion(vData.version);
        }

        if (metaRes && metaRes.ok) {
          const mData = await metaRes.json();
          if (mData?.lastUpdated) {
            setLastUpdated(new Date(mData.lastUpdated).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao carregar metadados no footer:", err);
      }
    }

    loadMetadata();
  }, []);

  const socialLinks = [
    {
      icon: <FaGlobe className="h-4 w-4" />,
      label: "Site Pessoal",
      url: urls.website,
    },
    {
      icon: <FaLinkedin className="h-4 w-4" />,
      label: "LinkedIn",
      url: urls.linkedin,
    },
    {
      icon: <FaGithub className="h-4 w-4" />,
      label: "GitHub",
      url: urls.github,
    },
  ];

  const allNavLinks = [
    { label: "Página Inicial", href: "/" },
    { label: "Analisar Propostas", href: "/opiniao" },
    { label: "Minhas Opiniões", href: "/opiniao/revisao" },
    { label: "Ver Afinidade Legislativa", href: "/afinidade" },
    { label: "Fontes Oficiais & FAQ", href: "/faq" },
  ];

  const navLinks = isReady
    ? allNavLinks
    : allNavLinks.filter((link) => link.href === "/" || link.href === "/faq");

  return (
    <footer className="bg-muted/40 border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-8">
          {/* Coluna 1: Sobre o Projeto & Banner de Feedback */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-primary flex items-center justify-center text-white">
                <FaBalanceScale className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-foreground">
                LegisVisão
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Uma plataforma cívica, independente e transparente para ajudar cidadãos
              a descobrirem sua afinidade política com base em votações nominais reais da
              Câmara dos Deputados e do Senado Federal.
            </p>

            {/* Card de Feedback */}
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-soft space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FaCommentDots className="text-primary w-3.5 h-3.5" />
                <span>Feedback, problema ou sugestão?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua opinião é fundamental para aprimorar a transparência legislativa:
              </p>
              <a
                href={urls.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-smooth"
              >
                <span>Falar com Luis Zancanela (zancanela.dev.br)</span>
                <FaExternalLinkAlt className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">
              Navegação
            </h4>
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary dark:hover:text-emerald-400 transition-smooth text-sm flex items-center gap-1.5"
                >
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Coluna 3: Desenvolvedor & Redes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">
              Desenvolvedor
            </h4>
            <p className="text-muted-foreground text-sm">
              Criado e mantido por{" "}
              <a
                href={urls.website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Luis Zancanela
              </a>
              . Conheça outros projetos e conecte-se:
            </p>
            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="h-9 w-9 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-primary dark:hover:text-emerald-400 flex items-center justify-center transition-smooth"
                >
                  {social.icon}
                </a>
              ))}
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 p-2.5 rounded-md border border-border">
                <FaShieldAlt className="text-primary w-4 h-4 shrink-0" />
                <span>Privacidade em 1º lugar: Suas opiniões nunca saem do seu dispositivo.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso Legal Cívico */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-muted-foreground space-y-2 mb-6">
          <div className="flex items-center gap-2 font-bold text-foreground text-sm">
            <FaBalanceScale className="text-amber-600 dark:text-amber-400 w-4 h-4 shrink-0" />
            <span>Aviso Legal Cívico</span>
          </div>
          <p className="leading-relaxed">
            <strong>Esta ferramenta não recomenda representantes. Apenas compara dados públicos.</strong> O LegisVisão é uma iniciativa cívica independente, de código aberto e apartidária, sem qualquer vínculo com partidos, coligações ou órgãos estatais.
          </p>
        </div>

        {/* Linha Inferior: Copyright, Metadados de Atualização e Versão */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div>
            © {getCopyRightYearsDisplay()}{" "}
            <a
              href={urls.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground font-medium transition-smooth"
            >
              Luis Zancanela
            </a>
            . Todos os direitos reservados.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {lastUpdated && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                <FaDatabase className="w-3 h-3 text-primary" />
                <span>Dados atualizados em: {lastUpdated}</span>
              </span>
            )}
            <Link
              href="/faq"
              className="text-primary hover:underline font-medium flex items-center gap-1"
            >
              <FaQuestionCircle className="w-3 h-3" />
              <span>Metodologia</span>
            </Link>
            <span className="text-muted-foreground font-mono">v{version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
