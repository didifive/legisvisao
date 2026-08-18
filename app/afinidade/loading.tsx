export default function AffinityLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="h-6 w-32 bg-primary/10 rounded-full mx-auto" />
        <div className="h-10 w-3/4 bg-muted rounded-xl mx-auto" />
        <div className="h-4 w-5/6 bg-muted/60 rounded mx-auto" />
      </div>

      {/* Podium Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card border border-border shadow-soft flex flex-col items-center text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-muted" />
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted/70 rounded" />
            <div className="h-8 w-24 bg-primary/10 rounded-lg" />
            <div className="h-3 w-full bg-muted/40 rounded-full" />
          </div>
        ))}
      </div>

      {/* Deputy Ranking List Skeleton */}
      <div className="space-y-3 pt-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted/60 rounded" />
              </div>
            </div>
            <div className="h-7 w-20 bg-muted rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </main>
  );
}
