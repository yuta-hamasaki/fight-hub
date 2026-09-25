import { Suspense, type ReactNode } from "react";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { notFound } from "next/navigation";
export default async function TrainerSettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ja" && locale !== "en") notFound();
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
      <aside>
        <Suspense fallback={null}>
          <DashboardNavigation locale={locale} trainer />
        </Suspense>
      </aside>
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
