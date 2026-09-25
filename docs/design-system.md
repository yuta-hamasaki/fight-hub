# Fight Hub UI refresh

The existing blue/navy identity is retained. Public discovery and authenticated workspaces share typography, spacing, cards, form controls, primary/secondary buttons, keyboard focus treatment and responsive navigation.

## Reference decisions

- [Digital Agency design system](https://design.digital.go.jp/dads/): persistent form labels, clear action hierarchy, text descriptions of status, and keyboard navigation. [Button accessibility](https://design.digital.go.jp/dads/components/button/accessibility/) informed visible focus and distinguishable button styles; [input guidance](https://design.digital.go.jp/dads/components/input-text/accessibility/) informed replacing placeholder-only labels in management forms.
- [Apple HIG buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): adequate hit regions, recognizable actions and pressed states. Shared buttons have a minimum 44px height; regular controls use 48px.
- [Material Design 3](https://m3.material.io/): supplied visual reference for consistent surfaces and navigation. Its JavaScript-only documentation was not fully readable through the research tool; this is not a claim of M3 compliance.

## Page coverage

- Global shell: bilingual navigation, mobile disclosure menu, skip link, footer, language marking and responsive spacing.
- Landing: working keyword search, real published trainer cards, clear booking steps; removed fictional testimonials, ratings and availability.
- Discovery: result count, reset action, expandable filters and stronger profile links.
- Trainer profiles: shared controls, a single main landmark and responsive content.
- Both dashboards, all workspace tabs, booking details, revenue and content: common desktop sidebar/mobile selector, active location, shared panels and status badges.
- Trainer management: section shortcuts; persistent labels for session, time and content fields; no nested button inside links.
- Onboarding: explanatory role cards. Authentication: orientation and consistent Clerk appearance.
- Stripe setup and return screens: shared workspace navigation, readable headings and simpler wording.
- Loading, missing pages and route errors: consistent feedback and recovery paths.

## Verification

TypeScript, ESLint and production build passed. Unit tests: 37 passed; 14 database integration tests skipped without TEST_DATABASE_URL. Public Japanese/English landing, directory and sign-in screens were checked in temporary Chrome, including the mobile menu. Responsive/search interaction checks are recorded in the task handoff. Authenticated screens were checked in source and build, but were not visually exercised with a signed-in account. No claim of a full accessibility audit or certification is made.

No payment behavior, database schema or email notification functionality was added by this refresh.
