import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface LandingSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function LandingSection({ id, title, description, children, className }: LandingSectionProps) {
  return (
    <section id={id} className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{title}</h2>
        {description ? <p className="max-w-3xl text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
