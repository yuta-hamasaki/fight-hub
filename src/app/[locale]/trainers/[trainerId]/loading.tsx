import { CardSkeleton } from "@/components/shared/loading-state";

export default function TrainerDetailLoading() {
  return (
    <div className="space-y-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
