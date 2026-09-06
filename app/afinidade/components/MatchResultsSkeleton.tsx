import { Skeleton } from "@/app/components/ui/Skeleton";

export function MatchResultsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in" aria-label="Calculando afinidade legislativa">
      {/* Tab Filter & Search Bar Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 flex-1 sm:w-48 rounded-xl" />
        </div>
      </div>

      {/* Top 3 Podium Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card border border-border shadow-soft flex flex-col items-center text-center space-y-4"
          >
            <div className="relative">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="absolute -top-2 -right-2 w-6 h-6 rounded-full" />
            </div>
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Ranking List Skeleton */}
      <div className="space-y-3 pt-4">
        <div className="flex justify-between items-center px-1">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card border border-border shadow-soft flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
