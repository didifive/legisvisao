"use client";

import { useState, useEffect } from "react";
import {
  FaRobot,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaSpinner,
  FaFlag,
} from "react-icons/fa";

export interface AiFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  propositionId?: number | string;
  propositionTitle?: string;
  sessionId?: string;
  sessionTitle?: string;
  reportedSummary?: string;
}

export function AiFeedbackModal({
  isOpen,
  onClose,
  propositionId,
  propositionTitle,
  sessionId,
  sessionTitle,
  reportedSummary,
}: AiFeedbackModalProps) {
  const [category, setCategory] = useState<string>("RESUMO_INCORRETO");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedIssueUrl, setSubmittedIssueUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issueNumber, setIssueNumber] = useState<number | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage("Por favor, descreva o problema com pelo menos 5 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFallbackUrl(null);

    try {
      const pageUrl = typeof window !== "undefined" ? window.location.href : "";
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          propositionId,
          propositionTitle,
          sessionId,
          sessionTitle,
          reportedSummary,
          pageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fallbackUrl) {
          setFallbackUrl(data.fallbackUrl);
        }
        throw new Error(data.error || "Falha ao enviar relato.");
      }

      if (data.issueUrl) {
        setSubmittedIssueUrl(data.issueUrl);
        setIssueNumber(data.issueNumber || null);
      } else {
        throw new Error("Resposta inválida do servidor ao criar issue.");
      }
    } catch (err) {
      setErrorMessage((err as Error).message || "Ocorreu um erro ao enviar o relato.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setDescription("");
    setCategory("RESUMO_INCORRETO");
    setSubmittedIssueUrl(null);
    setIssueNumber(null);
    setFallbackUrl(null);
    setErrorMessage(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FaFlag className="w-4 h-4" />
            </div>
            <div>
              <h3 id="feedback-modal-title" className="text-base sm:text-lg font-extrabold text-foreground leading-tight">
                Relatar Problema no Resumo de IA
              </h3>
              <span className="text-xs text-muted-foreground block mt-0.5">
                Auditoria cívica colaborativa do LegisVisão
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth cursor-pointer"
            aria-label="Fechar"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Tela de Sucesso */}
        {submittedIssueUrl ? (
          <div className="space-y-4 py-3 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <FaCheckCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-foreground">
                Relato Enviado com Sucesso!
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                O seu apontamento foi registrado como um chamado público de melhoria no repositório de desenvolvimento do LegisVisão.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-2 text-left">
              <p className="leading-relaxed">
                💡 <strong>Como funciona:</strong> O <em>GitHub</em> é a plataforma pública onde os desenvolvedores organizam as correções do site. Por ser um projeto de código aberto e sem fins lucrativos, os relatos são analisados diretamente no repositório para garantir transparência total.
              </p>
              <a
                href={submittedIssueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold pt-1"
              >
                <span>{issueNumber ? `Acompanhar Chamado #${issueNumber} no GitHub` : "Acompanhar Chamado no GitHub"}</span>
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-smooth cursor-pointer shadow-soft"
            >
              Concluir
            </button>
          </div>
        ) : (
          /* Formulário de Relato */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contexto da Proposição */}
            {propositionTitle && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block">
                  Matéria em Análise:
                </span>
                <p className="font-semibold text-foreground truncate">
                  {propositionTitle} {propositionId ? `(ID ${propositionId})` : ""}
                </p>
                {sessionTitle && (
                  <p className="text-muted-foreground text-[11px] truncate">
                    Deliberação: {sessionTitle}
                  </p>
                )}
              </div>
            )}

            {/* Categoria do Relato */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-category" className="text-xs font-bold text-foreground block">
                Tipo de Inconsistência:
              </label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth cursor-pointer"
              >
                <option value="RESUMO_INCORRETO">Resumo Incorreto ou Impreciso</option>
                <option value="VIES_POLITICO">Possível Viés ou Falta de Neutralidade</option>
                <option value="ERRO_SESSAO">Erro na Deliberação ou Mérito Votado</option>
                <option value="OUTRO">Outro / Sugestão de Melhoria</option>
              </select>
            </div>

            {/* Descrição do Relato */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-description" className="text-xs font-bold text-foreground block">
                O que está incorreto ou pode ser aprimorado?
              </label>
              <textarea
                id="feedback-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Exemplo: O resumo não mencionou que a isenção de impostos se aplica apenas a medicamentos essenciais..."
                maxLength={3000}
                required
                className="w-full p-3 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-smooth resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Mínimo 5 caracteres</span>
                <span>{description.length}/3000</span>
              </div>
            </div>

            {/* Mensagem de Erro com Opção de Abertura Direta no GitHub e Contato Alternativo */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs space-y-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <FaExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-left">
                    <p className="font-semibold leading-relaxed">{errorMessage}</p>
                    <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                      {fallbackUrl && (
                        <p>
                          Você pode{" "}
                          <a
                            href={fallbackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                          >
                            <span>abrir o chamado diretamente no GitHub</span>
                            <FaExternalLinkAlt className="w-2.5 h-2.5" />
                          </a>{" "}
                          (com o formulário já pré-preenchido).
                        </p>
                      )}
                      <p>
                        Ou se preferir, envie uma mensagem pela seção de contatos em{" "}
                        <a
                          href="https://zancanela.dev.br"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>zancanela.dev.br</span>
                          <FaExternalLinkAlt className="w-2.5 h-2.5" />
                        </a>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting || description.trim().length < 5}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:opacity-90 transition-smooth cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-soft"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Relato</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
