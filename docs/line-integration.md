# LINE notification integration

## Release status: disabled

LINE is not currently public. Dashboard cards and queries, OAuth/connection handlers, and LINE delivery in both notification services are commented out. The three LINE API routes return 404, even when credentials are configured. In-app notifications and scheduled reminder processing remain active; database models and existing connections are preserved.

To resume development, restore the commented code in the client/trainer dashboard pages, the three routes under `src/app/api/line/` (remove their temporary 404 handlers), and `src/lib/notifications/service.ts` and `src/lib/marketplace/notifications.ts`, including their imports. Uncomment the LINE variables in `.env.example`, configure actual credentials in the deployment, and restore the LINE delivery assertion in `src/lib/marketplace/notifications.test.ts`. The setup and behavior below describe the intended enabled integration.

LINE is an optional notification channel attached to the existing Clerk-authenticated `User`. It does not replace Clerk and disconnecting it only removes `LineConnection`; bookings, subscriptions, and reviews remain unchanged.

## LINE Developers setup

1. Under one LINE provider, create a **LINE Login** channel and a **Messaging API** channel connected to the app's LINE Official Account. Keeping them under the same provider ensures the verified LINE subject can be used by the Messaging API.
2. Add `https://<app-origin>/api/line/callback` as the LINE Login callback URL. Add both production and preview/development origins only when those deployments need to connect real accounts.
3. Enable the `openid` and `profile` scopes. The application requests both and verifies the returned ID token on the server.
4. Issue a long-lived Messaging API channel access token. Users must add the linked Official Account as a friend to receive push notifications; the connection flow requests this with `bot_prompt=aggressive` and records LINE's verified friendship status.

Configure these server-only variables (see `.env.example`):

- `LINE_LOGIN_CHANNEL_ID`
- `LINE_LOGIN_CHANNEL_SECRET`
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`
- `CRON_SECRET`

Set `NEXT_PUBLIC_APP_URL` to the canonical application origin when it is not already configured by the deployment. It is used for links in notification messages.

## Scheduled reminders

Invoke `GET /api/cron/booking-reminders` on a schedule (every 15 minutes is recommended) with `Authorization: Bearer <CRON_SECRET>`. The endpoint selects confirmed sessions in a 30-minute window around 24 hours from execution. `NotificationLog`'s unique constraint prevents overlapping cron executions from sending the same LINE reminder twice.

## Operational behavior

- Booking notifications run only after a verified Stripe webhook changes a booking from `PENDING` to `CONFIRMED`.
- Delivery is best-effort. LINE failures are logged without secrets and cannot revert payment or booking state.
- A failed delivery releases its notification claim so a later application retry can try again; successful claims provide idempotency across webhook and cron replays.
- Message language comes from the recipient's `Profile.locale`, with English as the fallback. The URL locale only changes presentation priority in the dashboards.

## Future LINE MINI App work

The existing localized trainer, booking, checkout, dashboard, and review routes should remain the canonical pages. A future LIFF layer only needs client-environment detection, LIFF initialization/deep-link handling, and optional navigation/header adaptation; it should not duplicate those pages or domain services.
