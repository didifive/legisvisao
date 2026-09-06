import { Skeleton } from "@/app/components/ui/Skeleton";
import { SyncSourcesSkeleton } from "./components/SyncSourcesSkeleton";

export default function FAQLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* Header Skeleton */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-72 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-4/5 rounded-lg mx-auto" />
      </div>

      {/* Sync Sources Panel Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-64 rounded-lg" />
        </div>
        <SyncSourcesSkeleton />
      </section>

      {/* Principle & Civic Guide Skeletons */}
      <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-lg" />
            <Skeleton className="h-3 w-80 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
      </div>
    </main>
  );
}
