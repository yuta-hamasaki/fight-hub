import { Suspense, type ReactNode } from "react";
import { DashboardNavigation } from "@/components/layout/dashboard-navigation";
import { requireDbUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "ja" && locale !== "en") notFound();
  const user = await requireDbUser(locale);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
      <aside>
        <Suspense
          fallback={
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          }
        >
          <DashboardNavigation
            locale={locale}
            trainer={user.role === "TRAINER"}
          />
        </Suspense>
      </aside>
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
