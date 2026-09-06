import { Skeleton } from "@/app/components/ui/Skeleton";
import { VoteFormSkeleton } from "./components/VoteFormSkeleton";

export default function OpinionLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Page Header Skeleton */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Skeleton className="h-6 w-36 rounded-full mx-auto" />
        <Skeleton className="h-10 w-3/4 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-5/6 rounded-lg mx-auto" />
      </div>

      {/* Vote Form Skeleton */}
      <VoteFormSkeleton />
    </main>
  );
}
