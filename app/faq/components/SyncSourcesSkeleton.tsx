import { Skeleton } from "@/app/components/ui/Skeleton";

export function SyncSourcesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" aria-label="Carregando status das fontes oficiais">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="p-5 sm:p-6 rounded-xl bg-card border border-border shadow-soft flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded-lg" />
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-44 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-48 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
