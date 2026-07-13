import { cn } from "@/lib/utils";

export function SkeletonCard() {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm">
      <div className="space-y-3">
        {/* Header (Badge + Date) */}
        <div className="flex justify-between">
          <div className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
          <div className="h-5 w-10 animate-pulse rounded bg-zinc-800" />
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-800" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-zinc-800" />
        </div>

        {/* Summary */}
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800/60" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800/60" />
        </div>
      </div>

      {/* Footer (Tags + Actions) */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-800/50 pt-3">
        <div className="flex gap-2">
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-12 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="h-4 w-4 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
