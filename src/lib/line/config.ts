export function getLineConfig() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const messagingAccessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  if (!channelId || !channelSecret || !messagingAccessToken) {
    throw new Error("LINE integration is not configured");
  }
  return { channelId, channelSecret, messagingAccessToken };
}

export function isLineConfigured() {
  return Boolean(
    process.env.LINE_LOGIN_CHANNEL_ID &&
      process.env.LINE_LOGIN_CHANNEL_SECRET &&
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
  );
}
