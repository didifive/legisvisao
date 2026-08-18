"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FaGithub,
  FaTimes,
  FaBars,
  FaDownload,
  FaUpload,
  FaTrashAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";
import { Button } from "./ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { useSystemStatus } from "./SystemStatusProvider";
import { urls } from "@/lib/urls";
import {
  exportAnswersToJson,
  parseAndValidateAnswersFile,
  saveStoredAnswers,
  clearStoredAnswers,
  getStoredAnswersCount,
  type StoredAnswers,
} from "@/lib/storage";
import { ConfirmationModal } from "./ui/ConfirmationModal";

export const Header = () => {
  const { isReady } = useSystemStatus();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [opinionsCount, setOpinionsCount] = useState(0);

  // Estados dos Modais de Confirmação
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    answers: StoredAnswers;
    total: number;
    fileName: string;
  } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const updateOpinionsCount = () => {
    setOpinionsCount(getStoredAnswersCount());
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    updateOpinionsCount();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleStorageUpdate = () => {
      updateOpinionsCount();
    };

    const handleRequestClear = () => {
      handleClear();
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("request-clear-opinions", handleRequestClear);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("request-clear-opinions", handleRequestClear);
    };
  }, []);

  const handleExport = () => {
    exportAnswersToJson();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Processa o arquivo selecionado:
   * 1. Valida internamente o arquivo (lança erro e avisa se inválido, sem abrir modal).
   * 2. Se válido e NÃO houver escolhas salvas -> importa direto.
   * 3. Se válido e HOUVER escolhas salvas -> abre modal de confirmação de substituição.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (e.target) e.target.value = "";

    try {
      const { answers, total } = await parseAndValidateAnswersFile(file);
      const currentCount = getStoredAnswersCount();

      if (currentCount === 0) {
        saveStoredAnswers(answers);
        showToast(`${total} opinião(ões) importada(s) com sucesso!`, "success");
        updateOpinionsCount();
      } else {
        setPendingImport({ answers, total, fileName: file.name });
        setIsImportModalOpen(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao validar o arquivo de opiniões.";
      showToast(msg, "error");
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    saveStoredAnswers(pendingImport.answers);
    showToast(`${pendingImport.total} opinião(ões) importada(s) com sucesso!`, "success");
    updateOpinionsCount();
    setIsImportModalOpen(false);
    setPendingImport(null);
  };

  /**
   * Limpeza de dados:
   * Se NÃO houver registros salvos -> não precisa de modal.
   * Se HOUVER registros salvos -> abre modal de confirmação.
   */
  const handleClear = () => {
    const currentCount = getStoredAnswersCount();
    if (currentCount === 0) {
      showToast("Nenhuma opinião salva para apagar.", "info");
      return;
    }
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    clearStoredAnswers();
    setIsClearModalOpen(false);
    showToast("Todas as opiniões foram apagadas do dispositivo.", "success");
    updateOpinionsCount();
  };

  const allNavItems = [
    { label: "Início", href: "/" },
    { label: "Analisar Propostas", href: "/opiniao" },
    { label: "Minhas Opiniões", href: "/opiniao/revisao" },
    { label: "Afinidade", href: "/afinidade" },
    { label: "Fontes & FAQ", href: "/faq" },
  ];

  const navItems = isReady
    ? allNavItems
    : allNavItems.filter((item) => item.href === "/" || item.href === "/faq");

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-smooth border-b ${isScrolled
            ? "bg-background/85 backdrop-blur-md shadow-soft border-border"
            : "bg-background/95 md:bg-background/70 md:backdrop-blur-sm border-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Nome do Projeto */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center p-1 shadow-soft group-hover:scale-105 transition-smooth overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="LegisVisão"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-foreground tracking-tight text-lg leading-none group-hover:text-primary transition-smooth">
                  LegisVisão
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-smooth relative ${isActive
                        ? "text-primary dark:text-emerald-400 bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                  >
                    <span>{item.label}</span>
                    {item.href === "/opiniao/revisao" && opinionsCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-primary text-white font-bold">
                        {opinionsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Actions: Import, Export, Clear, Theme, Social */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {isReady && (
                <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border space-x-1 text-xs">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={handleImportClick}
                    className="px-2 lg:px-2.5 py-1 rounded hover:bg-background transition-smooth flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    title="Importar opiniões salvas em JSON"
                  >
                    <FaUpload className="w-3 h-3 text-primary" />
                    <span className="hidden xl:inline">Importar</span>
                  </button>

                  <button
                    onClick={handleExport}
                    className="px-2 lg:px-2.5 py-1 rounded hover:bg-background transition-smooth flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    title="Exportar opiniões atuais como JSON"
                  >
                    <FaDownload className="w-3 h-3 text-secondary" />
                    <span className="hidden xl:inline">Exportar</span>
                  </button>

                  <button
                    onClick={handleClear}
                    className="px-2 lg:px-2.5 py-1 rounded hover:bg-background hover:text-destructive transition-smooth flex items-center gap-1 text-muted-foreground font-medium cursor-pointer"
                    title="Limpar opiniões salvas neste navegador"
                  >
                    <FaTrashAlt className="w-3 h-3" />
                  </button>
                </div>
              )}

              {isReady && <div className="w-px h-5 bg-border mx-0.5 lg:mx-1" />}

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                href={urls.github}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub do Projeto"
                className="w-9 h-9"
              >
                <FaGithub className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 md:hidden">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Abrir menu"
                className="w-9 h-9"
              >
                {isMobileMenuOpen ? (
                  <FaTimes className="h-5 w-5" />
                ) : (
                  <FaBars className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-3 shadow-medium">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-smooth ${isActive
                        ? "text-primary dark:text-emerald-400 bg-primary/10 font-semibold"
                        : "text-foreground hover:bg-muted"
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{item.label}</span>
                      {item.href === "/opiniao/revisao" && opinionsCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-bold">
                          {opinionsCount} opiniões
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {isReady && (
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Gerenciar Opiniões Locais
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportClick}
                    className="w-full text-xs flex items-center justify-center gap-1"
                  >
                    <FaUpload className="w-3 h-3 text-primary" />
                    Importar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="w-full text-xs flex items-center justify-center gap-1"
                  >
                    <FaDownload className="w-3 h-3 text-secondary" />
                    Exportar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="w-full text-xs text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1"
                  >
                    <FaTrashAlt className="w-3 h-3" />
                    Limpar
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between border-t border-border">
              <span className="text-xs text-muted-foreground">
                Ver código-fonte:
              </span>
              <Button
                variant="ghost"
                size="sm"
                href={urls.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs gap-1.5"
              >
                <FaGithub className="h-4 w-4" />
                GitHub
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Toast Notification */}
      {toast && (
        <output
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-large border flex items-center gap-2.5 animate-bounce transition-smooth text-sm font-medium ${toast.type === "error"
              ? "bg-card border-rose-500/30 text-rose-600 dark:text-rose-400"
              : toast.type === "info"
                ? "bg-card border-primary/30 text-primary"
                : "bg-card border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            }`}
        >
          {toast.type === "error" && <FaExclamationTriangle className="w-4 h-4 shrink-0" />}
          {toast.type === "info" && <FaInfoCircle className="w-4 h-4 shrink-0" />}
          {toast.type === "success" && <FaCheckCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </output>
      )}

      {/* Modal de Confirmação para Limpeza de Dados */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="Apagar todas as opiniões salvas?"
        description={
          <p>
            Você possui <strong className="text-foreground">{opinionsCount} opinião(ões)</strong> salva(s) neste navegador. Ao confirmar, todas as suas escolhas serão apagadas permanentemente do seu dispositivo.
          </p>
        }
        confirmLabel="Apagar Tudo"
        cancelLabel="Cancelar"
        variant="destructive"
        icon="trash"
      />

      {/* Modal de Confirmação para Importação com Substituição */}
      <ConfirmationModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setPendingImport(null);
        }}
        onConfirm={handleConfirmImport}
        title="Substituir opiniões existentes?"
        description={
          <div className="space-y-2">
            <p>
              Você já possui <strong className="text-foreground">{opinionsCount} opinião(ões)</strong> salva(s) neste navegador.
            </p>
            <p>
              A importação do arquivo <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{pendingImport?.fileName}</span> substituirá todas as suas respostas atuais pelas <strong className="text-foreground">{pendingImport?.total} opinião(ões)</strong> contidas no arquivo.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Deseja prosseguir com a substituição?
            </p>
          </div>
        }
        confirmLabel="Substituir e Importar"
        cancelLabel="Cancelar"
        variant="primary"
        icon="upload"
      />
    </>
  );
};
