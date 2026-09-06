import { Skeleton } from "@/app/components/ui/Skeleton";

export default function PoliticianLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Header do Deputado Skeleton */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44 rounded-full" />
            <Skeleton className="h-8 w-60 rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-xl shrink-0" />
      </div>

      {/* Votações Nominais Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <Skeleton className="h-6 w-56 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 sm:p-6 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                  </div>
                  <Skeleton className="h-6 w-3/4 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
