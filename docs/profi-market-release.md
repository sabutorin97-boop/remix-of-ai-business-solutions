# AI-Profigrup v2 — release gate

## Already committed
- Preview of five planned microproducts without touching the existing checkout.
- PostgreSQL draft schema (not applied).
- Pricing, loyalty, referral and margin calculation primitives.
- Payment adapter contract, deliberately disabled.
- Reactive AI and AI Radar input/report foundations.
- Unit test source (not executed).

## Next implementation sequence
1. Confirm actual production deployment repository and build workflow. Regenerate TanStack routes and run lint/build.
2. Choose an existing authorized database or provision a Russian-hosted PostgreSQL database; review draft migration with staging credentials. No production migration before backup and verification.
3. Implement authentication, session security, owner-only/admin authorization, customer mapping and server-side transaction layer. No public table access.
4. Implement order creation with trusted price snapshots, product activation and entitlements.
5. Obtain official Monecle merchant protocol and sandbox details. Use server secrets only, verify webhook authenticity and amount/order/currency, enforce unique event ID and atomic settlement. Keep existing manual payment flow. Refunds must support amount reconciliation and entitlement policy.
6. Implement bonus ledger with row locks, FIFO allocation, expiry and reservation rollback, no negative spendable balance; handle duplicate callbacks and refunds. Reward amounts must be agreed at checkout and never silently changed afterward.
7. Implement partner attribution (30 days), prevent self-referrals, hold rewards 14 days and reverse on refund. Keep cash payouts disabled until legal/tax review, verified payee details, and atomic payout reservation. Integrate existing partner bot only after inspecting storage and permission checks.
8. Account and admin UI: orders, downloads, bonus history, partner links, pending/available rewards, product flags, refund reconciliation, access audit. Do not expose other customers' data.
9. Reactive AI: authenticated brief form, bounded AI calls, validated result, retries/idempotency, private delivery and demo example. No personal customer data.
10. Radar: approved web-search providers, timestamped actual observations, source URLs, no invented rankings. Never fetch arbitrary user URLs without SSRF safeguards.
11. Add remaining products only after validation and unit economics. Use feature flags default off.
12. Launch organic content on permitted channels; track conversion and costs. Paid ads only after validating contribution.

## Commercial guardrail
300% markup means all variable costs <= 25% of net cash price. Include discounts, fees, tax reserve, production, support, acquisition and reward liabilities; avoid double-counting discounts/rewards in realized accounting. Proposed reward percentages are ceilings, not active offers. With high payment fees and tax reserve, even zero rewards may fail the target. No automatic cash payouts.
Existing bundle price 24,900 RUB; individual total 31,500 RUB.

## Release checks
- Test checkout catalog tampering, duplicate webhooks, wrong signatures, wrong amounts, concurrent bonus redemption, refunds, expired referral, self-referral, blocked partner, access isolation, payout duplication, AI failure and recovery.
- No real customer data or live payment secrets in GitHub.
- Confirm seller agreement, taxation, receipts, refund terms, privacy/localization and partner terms before accepting live payments.
- No merge or production deployment until tests and release checks pass.

## Current blockers
Production database/hosting and merchant account configuration not verified. Live payments and report generation not connected. This branch is a development foundation, not a launch-ready store.

## Neural employee product integration (2026-11-26)
The customer-facing OpenClaw distribution and five separately maintained package repositories are private, according to the owner. The sales/support bot is a separate local Git repository with no configured remote, according to the owner. Current GitHub connection cannot read the six private repositories (404); actual dependency graph, licenses, installation scripts and release mechanisms remain unverified. Keep private repository identifiers and operational details in restricted documentation, not this public repository.

### SKU mapping (commercial catalog, not verified installation dependencies)
- base: Base, 9,900 RUB
- photo: Photo, 4,900 RUB
- video: Video, 6,900 RUB
- design: Design, 3,900 RUB
- dev: Dev, 5,900 RUB
- all: all five packages, 24,900 RUB (individual total 31,500 RUB)
- updates: 1,490 RUB / month; confirm scope and whether extension applies to existing purchased packages only.
The main customer distribution is not an extra paid SKU. Confirm whether each package requires access to it and Base before automating fulfillment.

### Fulfillment workstream (P0)
1. Audit private READMEs, installation scripts, dependency manifests, licenses and release tags; verify the exact package/access matrix.
2. Keep the commerce app authoritative for paid orders and entitlements. Snapshot purchased SKU and release version. Use verified payment settlement, including audited manual payments, to enqueue idempotent fulfillment jobs.
3. Link customer GitHub identity by verified ownership, not a free-text username alone. Grant only necessary access; start with manual fulfillment. Evaluate restricted GitHub App permissions or authenticated package delivery in staging. No broad organization membership or tokens in client code.
4. Distinguish pending invitation, accepted access, fulfillment failure and retry; record external IDs and audit events. Never automatically grant all packages for an add-on purchase. Check Base prerequisite and update rights first.
5. Keep purchased version rights separate from update expiration. On refunds or expiry, apply contractual policy, check overlapping valid purchases and avoid removing unrelated access. Repository access cannot erase copies already downloaded.
6. Audit the local sales/support bot before linking to the order API. Back up the local repository, review .gitignore and history for secrets; only then consider a private remote with owner approval. Do not duplicate the existing partner bot or mix support privileges with payment administration.
7. Test duplicate payment events, failed invitations, repeated jobs, partial fulfillment, overlapping licenses, refunds, update renewal and unauthorized requests. Do not activate automatic grants until these pass.
8. Add account UI for purchased modules, install instructions, access status, update expiry and support ticket link. No public links to restricted artifacts.

### Access blocker
Authorize the GitHub connection for the studio account and selected six private repositories, or supply sanitized READMEs and repository trees. The local support bot cannot be inspected through GitHub until an authorized source is supplied. No private code or repository permissions changed.
