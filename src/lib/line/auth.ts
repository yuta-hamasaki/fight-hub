import { getLineConfig } from "./config";
import { lineRequest } from "./client";

type LineTokenResponse = { access_token: string; id_token: string };
type VerifiedLineIdentity = { sub: string };

export async function exchangeAndVerifyLineCode(code: string, redirectUri: string) {
  const config = getLineConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.channelId,
    client_secret: config.channelSecret,
  });
  const token = await lineRequest<LineTokenResponse>("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const identity = await lineRequest<VerifiedLineIdentity>("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: token.id_token, client_id: config.channelId }),
  });
  if (!identity.sub) throw new Error("LINE identity did not contain a subject");

  let friendStatus = false;
  try {
    const friendship = await lineRequest<{ friendFlag: boolean }>("https://api.line.me/friendship/v1/status", {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    friendStatus = friendship.friendFlag;
  } catch {
    // Friendship is supplemental; a verified identity can still be connected.
  }
  return { lineUserId: identity.sub, friendStatus };
}
