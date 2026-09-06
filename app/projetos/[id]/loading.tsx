import { Skeleton } from "@/app/components/ui/Skeleton";

export default function PropositionLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-soft space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-8 sm:h-10 w-4/5 rounded-xl" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>

        {/* Simulador de Voto Skeleton */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-5 w-48 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Deliberações Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded" />
        </div>

        {/* Tabs de Sessões */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>

        {/* Placar Skeleton */}
        <div className="p-6 rounded-xl bg-muted/20 border border-border space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {/* Botão de Expansão Skeleton */}
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </main>
  );
}
