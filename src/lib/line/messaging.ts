import { lineRequest } from "./client";
import { getLineConfig } from "./config";

export async function sendLineText(lineUserId: string, text: string) {
  const { messagingAccessToken } = getLineConfig();
  await lineRequest("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      authorization: `Bearer ${messagingAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text }] }),
  });
}
