import Link from "next/link";
import { FaCheckCircle, FaTimes } from "react-icons/fa";
import type { VoteFormToastProps } from "../types";

export function VoteFormToast({ toast, onClose }: Readonly<VoteFormToastProps>) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] p-4 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/30 shadow-medium text-foreground animate-fade-in space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <FaCheckCircle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-sm block text-foreground">
              Opinião registrada!
            </span>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {toast.propositionTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-smooth cursor-pointer"
          title="Fechar"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Link
          href="/opiniao/revisao"
          className="flex-1 text-center py-1.5 px-3 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-smooth border border-border"
        >
          Minhas Opiniões
        </Link>
        <Link
          href="/afinidade"
          className="flex-1 text-center py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-smooth shadow-soft"
        >
          Ver Afinidade &rarr;
        </Link>
      </div>
    </div>
  );
}
