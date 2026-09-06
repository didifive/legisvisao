import { Skeleton } from "@/app/components/ui/Skeleton";

export default function PartyLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      {/* Header do Partido Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 sm:h-10 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-12 w-32 rounded-xl shrink-0" />
      </div>

      {/* Bancada de Deputados Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
