import { Skeleton } from "@/app/components/ui/Skeleton";

export function RevisaoSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in" aria-label="Carregando revisão de opiniões">
      {/* Stats Bar Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5 flex-1 sm:flex-initial">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Answered Cards Skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-medium space-y-6"
          >
            {/* Header: Sigla, Badge, Ano */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>

            {/* Title & AI Summary */}
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            </div>

            {/* User Opinion Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-soft space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </div>

            {/* Other Sessions Expander Placeholder */}
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
