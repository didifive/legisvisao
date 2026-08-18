export default function OpinionLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-pulse">
      {/* Progress Bar Skeleton */}
      <div className="space-y-2 max-w-xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-4 w-12 bg-muted rounded" />
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full" />
      </div>

      {/* Simulator Card Skeleton */}
      <div className="p-6 sm:p-10 rounded-3xl bg-card border border-border shadow-medium space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-6 w-24 bg-primary/10 rounded-full" />
          <div className="h-5 w-20 bg-muted rounded" />
        </div>

        <div className="space-y-3">
          <div className="h-8 w-4/5 bg-muted rounded-xl" />
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-5/6 bg-muted/60 rounded" />
          <div className="h-4 w-2/3 bg-muted/60 rounded" />
        </div>

        {/* Action Buttons Skeleton */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20" />
          <div className="h-14 bg-rose-500/10 rounded-2xl border border-rose-500/20" />
        </div>
      </div>
    </main>
  );
}
