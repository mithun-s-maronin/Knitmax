import { Skeleton } from "@/components/ui/skeleton";

export default function DemoLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-7 grid gap-5 lg:grid-cols-[auto_1fr]">
        <Skeleton className="h-80 lg:w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading the demo
      </span>
    </div>
  );
}
