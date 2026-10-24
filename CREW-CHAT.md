# Common Room, Crew Chat and Drawing Studio — v2.2.5

**time to chat out the nicotine**

Overview is the Common Room: shared daily writing, recent chat and visible drawings, a composer, prominent clock-in/character controls, the preserved streak, compact check-ins/crew and clearer recent events. The fact card and questionable-workforce panel are removed from Overview; the separate journey guide remains.

## Shared daily page

One textbox autosaves without a Send button and resets at midnight in Europe/Helsinki, including daylight-saving boundaries. The server keeps a short two-day recovery window. Unsaved local drafts are retained by day.

Saves use revision compare-and-swap. The client merges disjoint edits and keeps both concurrent appends. Overlapping replacements stop autosave and show the remote text alongside the safe local draft. Users explicitly choose how to combine them. In-flight responses do not blindly replace newer typing.

## Drawing Studio

Drawing is the default I'm tweaking activity and a permanent, unscored Arcade cabinet/library entry. Tweakmax remains selectable; BLACKSITE and the voted side cabinet remain intact. Studio does not call competitive score or finale APIs. The three/five-minute coping clock does not limit drawing time.

The 2048 × 1536 canvas has three layers, arbitrary colours, fine brushes, opacity, eraser, fill, shapes, eyedropper, symmetry, zoom/pan, undo/redo, expanded studio mode and lossless PNG download. There are 263 concrete subjects and 60 scenarios (15,780 combinations), with editable prompts. No image-recognition or AI service is used.

Raster painting has no stroke, point or time cap. A recent undo history does not limit the final art. Legacy drafts import every stored stroke and point, including dots and eraser intent. The old local copy is removed only after successful IndexedDB persistence. New drafts contain lossless layer blobs and frozen submission receipts; close/reopen and lost-response retry preserve them.

Done → an explicit outcome → automatic chat post. The answer is omitted from chat. Only explicit resistance with device consent and character tracking creates a check-in. Not this time creates no nicotine-use report. Publication and a permitted check-in are atomic and idempotent. Save PNG remains available after failures and after posting.

## Original uploads, previews and retention

The 24 KiB gate and palette reduction are gone. Full PNG originals upload in resumable 48 KiB pieces and are SHA-256 verified. A separate 400 × 300 JPEG preview keeps Overview fast; the original remains lossless. A 24 MiB transport envelope is above the worst-case lossless output of the fixed canvas, so detail cannot trigger the former tiny limit. No artist must undo strokes to fit.

Keep up to 100 originals within a 96 MiB shared gallery budget for seven days. Cleanup removes older files rather than rejecting detail in new art; text prompts/conversations remain. v2.1 images and APIs stay compatible. Incomplete upload reservations have a separate 96 MiB staging budget and expire after two hours; parts cascade away. Local originals remain available to retry/download. Active-data bounds do not replace PostgreSQL vacuum/reuse for physical disk usage.

Recent home previews load lazily near the viewport; original pieces load only on request. Text/metadata uses pagination and revision polling. Gameplay snapshots omit chat. The existing 64 MiB daily chat-response budget and burst guards remain. These protections do not guarantee that other app features or abusive traffic never reach whole-project free limits. Supabase has separate database/storage/bandwidth allowances: [pricing](https://supabase.com/pricing), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

All new tables are private, RLS-enabled and have no direct client grants. RPCs use fail-closed admission, fixed search paths and explicit execution grants. No public bucket or external image URL is used. Character deletion cascades to art/uploads. Profile export adds an original-art manifest; originals are individually downloadable. Shared daily writing remains a group page until its short daily retention expires.

## Sources and release

Sources: chat.js (compatibility), drawing.js (quick-dialog bridge), community-core.js (prompts/merge), art-api.js (IndexedDB/resumable transfer), studio.js (editor), community.js/home.html/community.css (Overview/cabinet). build.mjs and package.mjs integrate them.

Migrations: v2.1 chat.sql, then v2.2 v22.sql. Preserve existing images, profiles, game data, privacy, boss limits and the rotating ballot. Follow AGENTS.md for future release authorization. Mark a release complete only after database and public client verification.

Tests: community-core-tests.mjs, v22-db-tests.mjs, v22-browser-tests.mjs, v22-recovery-tests.mjs and relevant game regressions. They cover concurrent notes, >800-stroke recovery, >24 KiB originals, exact client-to-SQL transfer contracts, resume/hash/idempotence, real phone touch, IndexedDB drafts, immediate Overview pictures and private grants. Tests use isolated demo/local data, never fake live group records.

## v2.2.5 front-page layout

Crew updates unifies chat/art and recent nicotine check-ins, with three filters and the composer above messages. Full chat still contains conversations only. On phones this front-page panel starts collapsed; it fetches preview images only when expanded and near view. Explicit View chat after drawing opens the panel. Nicotine support controls precede the streak, daily page and social feed on phones. No database changes.
