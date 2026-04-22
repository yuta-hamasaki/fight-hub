import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ValueCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
}

export function ValueCard({ title, description, icon, className }: ValueCardProps) {
  return (
    <Card className={cn("border-slate-200 bg-white shadow-sm", className)}>
      <CardHeader className="space-y-2 pb-3">
        {icon ? <div className="text-blue-600">{icon}</div> : null}
        <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
