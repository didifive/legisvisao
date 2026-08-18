export default function PropositionLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-soft space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-28 bg-primary/10 rounded-full" />
            <div className="h-6 w-36 bg-muted rounded-full" />
          </div>
          <div className="h-8 sm:h-10 w-4/5 bg-muted rounded-xl" />
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-3/4 bg-muted/60 rounded" />
        </div>

        {/* Simulador de Voto Skeleton */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-muted rounded-xl" />
            <div className="h-9 w-28 bg-muted rounded-xl" />
          </div>
        </div>
      </div>

      {/* Deliberações Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-64 bg-muted rounded-lg" />
          <div className="h-4 w-36 bg-muted rounded" />
        </div>

        {/* Tabs de Sessões */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
              <div className="h-4 w-full bg-muted/60 rounded" />
              <div className="h-3 w-1/2 bg-muted/40 rounded" />
            </div>
          ))}
        </div>

        {/* Placar Skeleton */}
        <div className="p-6 rounded-xl bg-muted/20 border border-border space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
            <div className="h-12 bg-muted rounded-lg" />
          </div>
          <div className="h-3 w-full bg-muted rounded-full" />
        </div>

        {/* Botão de Expansão Skeleton */}
        <div className="h-14 w-full bg-muted/30 border border-border rounded-xl" />
      </div>
    </main>
  );
}
