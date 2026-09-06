import { Skeleton } from "@/components/ui/skeleton";

export default function ResultsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
      <div className="flex flex-col items-center gap-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="size-64 rounded-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
      <span className="sr-only" role="status">
        Calculating your results
      </span>
    </div>
  );
}
