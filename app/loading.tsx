import { Skeleton } from "@/app/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Hero Skeleton */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-6 w-36 rounded-full mx-auto" />
        <Skeleton className="h-10 sm:h-12 w-3/4 rounded-xl mx-auto" />
        <Skeleton className="h-5 w-5/6 rounded-lg mx-auto" />
      </div>

      {/* Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-card border border-border/70 shadow-soft space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-6 w-5/6 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
            <div className="pt-4 border-t border-border/50 flex justify-between items-center">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
