export default function PoliticianLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Header do Deputado Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted shrink-0" />
          <div className="space-y-2">
            <div className="h-5 w-44 bg-primary/10 rounded-full" />
            <div className="h-8 w-60 bg-muted rounded-lg" />
            <div className="flex gap-3">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
            </div>
          </div>
        </div>
        <div className="h-9 w-36 bg-muted rounded-xl shrink-0" />
      </div>

      {/* Votações Nominais Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="h-6 w-56 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted/60 rounded" />
                </div>
                <div className="h-8 w-20 bg-muted rounded-xl shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
