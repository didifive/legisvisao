import { Skeleton } from "@/app/components/ui/Skeleton";

export function VoteFormSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-label="Carregando propostas legislativas">
      {/* Filter Panel Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
      </div>

      {/* Proposition Cards Skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-medium space-y-6"
          >
            {/* Header: Sigla, Badge, Ano, Compartilhar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>

            {/* Title & Ementa */}
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <Skeleton className="h-4 w-4/6 rounded" />
              </div>
            </div>

            {/* Merit Session Vote Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-soft space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-4/5 rounded" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>

            {/* Secondary Sessions Button Placeholder */}
            <div className="pt-2">
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
