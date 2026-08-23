import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/constants/locales";

type Props = {
  locale: Locale;
  connected: boolean;
  enabled?: boolean;
  role: "client" | "trainer";
  copy: {
    title: string;
    description: string;
    email: string;
    enabled: string;
    line: string;
    connected: string;
    notConnected: string;
    connect: string;
    disconnect: string;
    enable: string;
    disable: string;
  };
};

export function LineConnectionCard({ locale, connected, enabled = false, role, copy }: Props) {
  const prominent = locale === "ja";
  return (
    <Card className={prominent ? "border-[#06c755] bg-emerald-50/60 shadow-sm" : "border-border bg-muted/20"}>
      <CardHeader>
        <CardTitle className={prominent ? "text-emerald-800" : "text-base"}>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {role === "client" ? <div className="flex justify-between text-sm"><span>{copy.email}</span><span>{copy.enabled}</span></div> : null}
        <div className="flex justify-between text-sm"><span>{copy.line}</span><span>{connected ? copy.connected : copy.notConnected}</span></div>
        {connected ? (
          <div className="flex flex-wrap gap-2">
            <form action="/api/line/connection" method="post">
              <input type="hidden" name="action" value={enabled ? "disable" : "enable"} />
              <Button type="submit" variant={prominent ? "default" : "outline"}>{enabled ? copy.disable : copy.enable}</Button>
            </form>
            <form action="/api/line/connection" method="post">
              <input type="hidden" name="action" value="disconnect" />
              <Button type="submit" variant="outline">{copy.disconnect}</Button>
            </form>
          </div>
        ) : (
          <a className={buttonVariants({ variant: prominent ? "default" : "outline", className: prominent ? "bg-[#06c755] hover:bg-[#05ad49]" : "" })} href={`/api/line/connect?locale=${locale}`}>{copy.connect}</a>
        )}
      </CardContent>
    </Card>
  );
}
