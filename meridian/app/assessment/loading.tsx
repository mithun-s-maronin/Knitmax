import { Skeleton } from "@/components/ui/skeleton";

export default function AssessmentLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-3 h-1.5 w-full" />
      <Skeleton className="mt-8 h-[32rem] rounded-2xl" />
      <span className="sr-only" role="status">
        Loading your assessment
      </span>
    </div>
  );
}
