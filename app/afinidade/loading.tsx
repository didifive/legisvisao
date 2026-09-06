import { Skeleton } from "@/app/components/ui/Skeleton";
import { MatchResultsSkeleton } from "./components/MatchResultsSkeleton";

export default function AffinityLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Skeleton */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Skeleton className="h-6 w-32 rounded-full mx-auto" />
        <Skeleton className="h-10 w-3/4 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-5/6 rounded mx-auto" />
      </div>

      {/* Match Results Skeleton */}
      <MatchResultsSkeleton />
    </main>
  );
}
