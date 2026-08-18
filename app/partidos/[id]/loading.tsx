export default function PartyLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-28 bg-muted rounded" />
      </div>

      {/* Header do Partido Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-primary/10 rounded-full" />
          <div className="h-8 sm:h-10 w-48 bg-muted rounded-xl" />
          <div className="h-4 w-64 bg-muted/60 rounded" />
        </div>
        <div className="h-12 w-32 bg-muted rounded-xl shrink-0" />
      </div>

      {/* Bancada de Deputados Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
