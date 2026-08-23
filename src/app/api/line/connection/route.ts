import { auth } from "@clerk/nextjs/server";

import { ensureDbUser } from "@/lib/auth/session";
import { disconnectLine, setLineNotifications } from "@/lib/line/connections";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await ensureDbUser(userId);
  const form = await request.formData();
  const action = form.get("action");
  if (action === "disconnect") await disconnectLine(user.id);
  else if (action === "enable" || action === "disable") await setLineNotifications(user.id, action === "enable");
  else return Response.json({ error: "Invalid action" }, { status: 400 });

  const referer = request.headers.get("referer");
  return Response.redirect(referer && referer.startsWith(new URL(request.url).origin) ? referer : new URL("/en/dashboard", request.url), 303);
}
