import { CardSkeleton, PageSpinner } from "@/components/shared/loading-state";

export default function LocaleLoading() {
  return (
    <div className="space-y-6">
      <PageSpinner />
      <CardSkeleton />
    </div>
  );
}
