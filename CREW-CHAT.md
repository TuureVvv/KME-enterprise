# Crew Chat / drawing side quests — v2.1 NIKO NOOOO DONT DO IT

This feature set is included in the user-authorized v2.1 release alongside the BLACKSITE improvements. Future changes stay local until the user authorizes another release. Read AGENTS.md first.

## Behaviour

Crew Chat replaces Break Room. A character can send multiple messages on the same UTC day. Messages remain 1–280 characters, with replies, respect reactions and posting-device removal. The brief burst guard allows 20 chat actions per device per minute; there is no daily posting allowance. Messages and drawings grant no boss damage, combat advantage or rank.

“I'm tweaking” keeps its shared 3/5-minute coping clock and offers Tweakmax or a primitive drawing canvas. The first two visits suggest Tweakmax and every third suggests drawing. Either is selectable. A saved, unconfirmed game receipt takes priority over the suggestion. Drawing prompts are playful objects such as a pineapple, a rat in a tie or a goblin on holiday. There is no image recognition, quality judgement or AI processing.

The canvas supports touch/pen/mouse, seven colours including an eraser, three pen widths, undo, clear and keyboard drawing (arrow keys and Space). Unfinished work stays in browser storage for that device/character. Closing or switching games never posts an unfinished drawing. Done opens explicit “I resisted” / “Not this time” choices. Selecting either posts the drawing and prompt automatically. The answer is omitted from the chat post. Explicit resistance is recorded only if device nicotine-sharing consent and character tracking are enabled. Not this time creates no nicotine-use report. Submission receipts freeze the original image/answer across retries, with atomic database insertion and no duplicate resistance reports.

## Bounds and free-plan design

- Keep the newest **10,000 text messages and replies**, with no arbitrary age expiry for text. At capacity, remove the oldest individual leaves first so a fresh reply on an old root is not cascaded away merely because its root is old. Manual root removal still deletes the thread.
- Store at most **100 drawings**, each a **320 × 240 PNG under 24 KiB**, for at most **seven days**. Expired/excess drawing bytes are deleted on the next chat cleanup; the message/prompt remains. Cleanup runs on writes and at most once per minute on list activity. Nothing grows while the app is idle, so no paid scheduler or storage bucket is needed.
- Drawing binary payload is bounded to **2,457,600 bytes** (about 2.34 MiB) across the group. It lives in the private database, avoiding public image URLs, Storage bucket policies and orphaned uploads. A PNG signature/IHDR/dimension check and payload ceiling reject SVG, HTML, arbitrary external URLs and oversized submissions. The browser supplies real raster PNGs; the server header check is not a full PNG content validator.
- Fetch only 30 text/metadata rows at a time using a timestamp-and-ID cursor. Thread replies are paged separately. Gameplay world snapshots omit chat. A visible chat checks a small revision response every 20 seconds, with no hidden-tab polling.
- Drawings download only after View drawing is tapped. Cache at most 20 in memory, and respect image expiry. A bounded daily **64 MiB chat response budget** (payload size plus a 512-byte estimate per response) pauses chat downloads until the next UTC day when exhausted. Sending remains available. Old budget rows are pruned.
- Up to 20,000 respect reactions are retained. Text, drawings, receipts and reactions all cascade with character deletion. Profile export includes retained drawings. Private tables have RLS enabled and no direct client grants; public RPCs call the existing fail-closed admission guard. Owner helpers have client execution revoked.

Supabase currently lists 500 MB database space, 1 GB file storage and 5 GB egress on Free: [official pricing](https://supabase.com/pricing). Database and file-storage quotas are separate. These bounds leave chat a small share of database space and reduce downloads, but cannot guarantee that the **whole project**, other app features, provider accounting overhead or abusive traffic never reaches a free limit. Deleting rows bounds active records; normal PostgreSQL vacuuming/reuse governs physical disk usage. [Egress documentation](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [functions and permissions](https://supabase.com/docs/guides/database/functions).

## Implementation and future release

Sources: `chat.js`, `drawing.js`, `chat-style.css`, `chat.sql`; included by `build.mjs` and `package.mjs`. The existing game code and named public patch are preserved. The migration wraps the existing world and profile-export functions once, drops the old unique daily-post index, and replaces the existing social RPC with the unrestricted daily chat behaviour. It adds no public tables or public bucket. It preserves all character/game/health records and current arcade ballots.

**Release migration: `supabase/migrations/20261024070000_crew_chat.sql` (local source: `work/v6/chat.sql`).** It has been tested locally using PostgreSQL-compatible PGlite, including rerunning it. Release procedure: apply the tested migration before publishing the new client, rebuild without `--pending`, assign the user's release name/version, include all cumulative BLACKSITE work, verify Pages and public RPC behaviour, then update RELEASE-PENDING.md. Existing clients may temporarily show an empty social feed until they load the new client; game/character APIs remain available.

Local build: `node work/v6/compose-renderer.mjs`, `node work/v6/build.mjs --pending`, `node work/v6/package.mjs --pending`. Preview: `outputs/crew-chat-pending-preview.html` (same cumulative build as `outputs/blacksite-pending-preview.html`).

Tests: `chat-db-tests.mjs`, `chat-browser-tests.mjs` (also `--file`), `drawing-touch-tests.mjs`, `quick-browser-tests.mjs`, plus the existing BLACKSITE pending regression suites. Browser checks use isolated demo data with zero live Supabase requests. Test screenshots are under `outputs/previews/pending-drawing-*` and `pending-crew-chat.png`.
