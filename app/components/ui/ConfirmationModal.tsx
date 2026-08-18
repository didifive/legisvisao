"use client";

import { useEffect, useCallback } from "react";
import { FaTimes, FaExclamationTriangle, FaTrashAlt, FaUpload } from "react-icons/fa";
import { Button } from "./Button";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "warning";
  icon?: "trash" | "upload" | "warning";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  icon = "warning",
  isLoading = false,
}: Readonly<ConfirmationModalProps>) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    },
    [isOpen, isLoading, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-large p-6 sm:p-7 space-y-5 animate-scale-in text-foreground">
        {/* Fechar no canto superior */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-smooth cursor-pointer disabled:opacity-50"
        >
          <FaTimes className="w-4 h-4" />
        </button>

        {/* Ícone e Título */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              variant === "destructive"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                : variant === "warning"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {icon === "trash" && <FaTrashAlt className="w-5 h-5" />}
            {icon === "upload" && <FaUpload className="w-5 h-5" />}
            {icon === "warning" && <FaExclamationTriangle className="w-5 h-5" />}
          </div>

          <div className="space-y-1 pr-6">
            <h3 id="modal-title" className="text-lg font-bold text-foreground">
              {title}
            </h3>
          </div>
        </div>

        {/* Corpo da Mensagem */}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>

        {/* Ações */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="default"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm font-semibold"
          >
            {cancelLabel}
          </Button>

          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="default"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto text-sm font-bold shadow-soft"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
