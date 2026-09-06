import { Skeleton } from "@/app/components/ui/Skeleton";
import { RevisaoSkeleton } from "./components/RevisaoSkeleton";

export default function RevisaoLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Content Skeleton */}
      <RevisaoSkeleton />
    </main>
  );
}
