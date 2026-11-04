# KME v6.0 — AFTER HOURS

Current cumulative extension: `work/v13`, over `work/v12` (v5) and preserved v11/v10/v8 source. Old workspace source was already imported; do not recopy it over this release.

Build: `node work/v13/build.mjs`. Test: `node work/v13/test.mjs`. Continue an interrupted validation pass with `--resume` only when checked inputs are unchanged. Prepare the release manifest: `node work/v13/release.mjs`. These commands do not publish or mutate the production database.

The test environment uses the existing pinned Playwright/PGlite runtimes; `test-env.mjs` records local discovery paths. All browser tests block the real crew backend. Database tests run in an isolated in-memory database with fixtures, never the real group. Public demo verification uses `--live` and still blocks backend access.

Source is split into authored content/puzzle rules (`core.js`), live and demo contracts (`adapters.js`), download/recovery handling (`reliability.js`), site shell (`site.js`), cooperative operations (`operations.js`), quiet/journal rooms, gallery, puzzle UI and lifecycle integration. The new site code lives in one assembly scope to avoid collisions with historical release names.

One additive CLI-created migration: `supabase/migrations/20261104003426_kme_v60_after_hours.sql`. Five closed private tables, indexed actor FKs, explicit admission checks, authenticated-only public RPCs, empty search paths, bounded metadata pages, actor/device/week-bound action receipts and private profile export/deletion integration. The v4 collection epoch and economy are unchanged. Apply only after local checks and live metadata review. Do not reapply any old reset migration.

The helpers `improve-puzzle.mjs`, `refine-home.mjs` and `final-polish.mjs` record one-time authoring operations. They are not build steps and must not be rerun automatically. `build.mjs` reads the finished source directly.

Release evidence belongs in `outputs/V6-*` and `outputs/DEPLOYMENT-v6.0.json`. Preserve the v4.0.1 baseline and all unrelated public repository assets. Publication uses the connected GitHub API with an expected-head lease; verify the Pages run, deployed file fingerprints and playable isolated public demo before declaring live.
