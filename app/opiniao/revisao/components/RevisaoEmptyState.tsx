import { FaFileAlt } from "react-icons/fa";
import { Button } from "@/app/components/ui/Button";

export function RevisaoEmptyState() {
  return (
    <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border text-center space-y-4 shadow-soft">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <FaFileAlt className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        Você ainda não registrou nenhuma opinião
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Analise as propostas de lei deliberadas na Câmara dos Deputados e descubra sua afinidade legislativa.
      </p>
      <div className="pt-2">
        <Button variant="hero" href="/opiniao">
          Começar a Analisar Propostas
        </Button>
      </div>
    </div>
  );
}
