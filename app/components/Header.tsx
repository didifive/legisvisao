"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaGithub,
  FaTimes,
  FaBars,
  FaDownload,
  FaUpload,
  FaTrashAlt,
  FaBalanceScale,
  FaCheckCircle,
} from "react-icons/fa";
import { Button } from "./ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { urls } from "@/lib/urls";
import {
  exportAnswersToJson,
  importAnswersFromJson,
  clearStoredAnswers,
  getStoredAnswers,
} from "@/lib/storage";

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [opinionsCount, setOpinionsCount] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const updateOpinionsCount = () => {
    const answers = getStoredAnswers();
    setOpinionsCount(Object.keys(answers).length);
  };

  useEffect(() => {
    updateOpinionsCount();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleStorageUpdate = () => {
      updateOpinionsCount();
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage-answers-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage-answers-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleExport = () => {
    exportAnswersToJson();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importAnswersFromJson(
      file,
      (total) => {
        showToast(`${total} opinião(ões) importada(s) com sucesso!`);
        updateOpinionsCount();
      },
      (err) => {
        alert(err);
      }
    );

    if (e.target) e.target.value = "";
  };

  const handleClear = () => {
    if (opinionsCount === 0) {
      alert("Nenhuma opinião salva localmente.");
      return;
    }
    const confirmed = window.confirm(
      "Tem certeza que deseja apagar todas as suas opiniões salvas localmente? Esta ação não pode ser desfeita."
    );
    if (confirmed) {
      clearStoredAnswers();
      showToast("Todas as opiniões foram apagadas.");
      updateOpinionsCount();
    }
  };

  const navItems = [
    { label: "Início", href: "/" },
    { label: "Analisar Propostas", href: "/opiniao" },
    { label: "Minhas Opiniões", href: "/opiniao/revisao" },
    { label: "Afinidade", href: "/afinidade" },
    { label: "Fontes & FAQ", href: "/faq" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-smooth border-b ${
          isScrolled
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
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-smooth">
                <FaBalanceScale className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground group-hover:text-primary transition-smooth">
                  LegisVisão
                </span>
                <span className="text-[10px] text-muted-foreground -mt-1 font-medium">
                  Afinidade Legislativa
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-smooth relative ${
                      isActive
                        ? "text-primary dark:text-emerald-400 bg-primary/10 font-semibold"
                        : "text-foreground/80 hover:text-primary hover:bg-muted"
                    }`}
                  >
                    {item.label}
                    {item.href === "/opiniao/revisao" && opinionsCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary font-bold">
                        {opinionsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Actions: Import, Export, Clear, Theme, Social */}
            <div className="hidden lg:flex items-center space-x-2">
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
                  className="px-2.5 py-1 rounded hover:bg-background transition-smooth flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  title="Importar opiniões salvas em JSON"
                >
                  <FaUpload className="w-3 h-3 text-primary" />
                  Importar
                </button>

                <button
                  onClick={handleExport}
                  className="px-2.5 py-1 rounded hover:bg-background transition-smooth flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  title="Exportar opiniões atuais como JSON"
                >
                  <FaDownload className="w-3 h-3 text-secondary" />
                  Exportar
                </button>

                <button
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded hover:bg-background hover:text-destructive transition-smooth flex items-center gap-1 text-muted-foreground font-medium cursor-pointer"
                  title="Limpar opiniões salvas neste navegador"
                >
                  <FaTrashAlt className="w-3 h-3" />
                </button>
              </div>

              <div className="w-px h-5 bg-border mx-1" />

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
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-smooth ${
                      isActive
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

      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-card border border-border text-foreground px-4 py-3 rounded-lg shadow-strong flex items-center gap-2 animate-bounce transition-smooth text-sm">
          <FaCheckCircle className="text-primary w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}
    </>
  );
};
