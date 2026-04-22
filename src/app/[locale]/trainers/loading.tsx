import { CardSkeleton } from "@/components/shared/loading-state";

export default function TrainersLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <CardSkeleton key={`trainer-skeleton-${index}`} />
      ))}
    </div>
  );
}
