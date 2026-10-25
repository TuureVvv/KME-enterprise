# v2.9 quality integration

Read AGENTS.md and RELEASE-PENDING.md. A human release announcement authorizes the cumulative application queue; scheduled arcade work remains local until directly released. BLACKSITE is permanent.

Use `node work/v7/build.mjs --pending` for a labelled local site, then `node work/v7/package.mjs --pending` for its standalone preview. For an authorized release, rebuild/package without --pending. The v7 build calls the preserved v6 scaffold and adds quality-core.js, noticeboard.js, wardrobe.js, notifications.js, push-restore.js, drafts.js, layout.js and quality.css. Do not ship a v6-only rebuild: it would remove this integration. Game engine/renderer sources remain under work/v6; compose its renderer before the v7 build after edits.

## Data and migrations

Working sources: v29.sql, push.sql and push-cron.sql. Migration files were created with Supabase CLI and are in supabase/migrations. Align their version prefix with the verified remote migration record after applying through MCP. All new tables are private, RLS-enabled and have no direct client grants. Exposed RPCs guard admission and use fixed empty search_path. VAPID private keys and scheduler credentials are generated on the server and never enter source or manifests.

The board is permanent. Do not restore daily reset behavior. Legacy daily-note RPCs bridge the same title-preserving board during upgrades. New reads omit text on unchanged revisions. Title and body merge independently; conflict resolution never silently discards a local draft.

Cosmetics are server-authoritative. Catalog has six slots. Cosmetic awards arise from saved art, validated finished game records and explicit consented resistance, with per-device and per-character daily caps and unique receipts. Keep the shared award lock ordering; it avoids races when one action grants art/game and resistance awards together. Purchases lock the wallet row and validate ownership. Preserve profile deletion/export and old capsule auras. No money, trading or game power.

## Push

push-sender.ts + push-utils.js + deno.json/lock define kme-push. verify_jwt=false is required for the scheduler's separate credential; the body verifies either an Auth JWT through /auth/v1/user plus kme_has_access, or the dedicated scheduler token. Do not accept a publishable key as authorization. Never put the service-role credential into pg_net headers. Service-only key/claim/completion RPCs remain uncallable by authenticated/anon clients.

Known provider hosts only, encrypted aes128gcm payloads, generic text, bounded jobs, lease tokens, retries, revoked-session/password-version checks and cleanup are required. No push is sent without an opted-in subscription. iOS16.4+ requires Home Screen installation and a permission request directly from the user's click. Never auto-request permission or cache API responses/private art. Keep the linked character explicit when saving device settings. Actual phone delivery must be tested by the user after install/permission; headless tests cannot prove it.

The minute cron checks for due work and otherwise makes no Edge request. Keep its dedicated credential private and endpoint fixed. Remove expired subscriptions and queues; retain at most three days of dispatch history. Pin web-push and its lock. Local dependency/tool/cache directories are not application release files.

## Layout and routing

Overview support controls stay before social features on phones. Crew updates defaults to Chat & art and includes replies, with loading/retry and explicit full-chat access. Private text drafts and persistent send receipts are stored locally; never auto-send on reconnect or clear newer typing after an older send succeeds.

Chat aliases the old lounge/activity routes into one two-column room, with phone tabs. Play aliases bosses/arena into one hub. Keep moved DOM IDs for existing renderers; legacy v4-live-title and v4-relief-left remain hidden compatibility sinks. Secondary panels are native details; do not clutter the main play area. Preserve game cleanup and result banking when navigating away.

## Checks

- db-tests.mjs; push-db-tests.mjs (local PGlite only)
- browser-tests.mjs (--live supported); reliability-tests.mjs
- game-regression-tests.mjs; existing work/v6/pending-engine-tests.mjs and v22-recovery-tests.mjs
- push-client-tests.mjs; Deno push-sender-tests.ts (real crypto, mocked providers)
- public-verification.mjs after deployment; verify public hashes/anonymous denial and record commit/run/migration metadata

Never create fake live messages, votes, scores, drawings or health reports. Read only required metadata/function definitions for diagnostics. Publish via the connected GitHub repository TuureVvv/KME-enterprise, verified Pages branch TuureVvv-MAJORPATCH_1. Finish with a public deployment record, updated pending queue and ZIPs; never claim a failed or unverified deployment.

## Managed pg_net boundary

Managed pg_net table grants cannot be relied on as revocable by the project owner. No persistent credential is sent through it: the dispatcher uses a random 90-second ticket, consumed atomically once by the service-only kme_push_dispatch_admit RPC. The stable claim credential and VAPID keys stay private. Empty schedules make no HTTP request. See https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357 . The verified backend history has 21 bounded v2.9 migrations; publish those exact files, not aggregate drafts.
