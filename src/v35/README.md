# v3.5 — The Dark Side Of NICOTINE!

Read the root constitution/handoff, then `DESIGN-IMPLEMENTATION-PLAN.md`, `PATCH.md` and `VALIDATION.md`. `USER-BRIEF.txt` preserves the supplied reference locally; its nicotine-consumption reward proposal was deliberately replaced with confirmed non-consumption activity.

## Current source

| File | Responsibility |
| --- | --- |
| `nightfall-core.js` | Shared Helsinki calendar, roster targets, bounded receipt ledger, ten legacy aura definitions and prices |
| `adapters.js` | Explicit live RPC adapters and isolated DemoRepository equivalents, export/deletion |
| `nightfall.sql` | Additive private tables, award triggers, admitted RPCs, inventory transactions, world/export wrappers |
| `team-ui.js` | Overview strip, Play standings, optional crew choice, Rally, roster, rules and previous operation |
| `aura-ui.js` | Wardrobe collection, profile/identity effects, preview, equip/remove, crafting and durable retry receipts |
| `audio.js` | Original synthesized tracks, one bounded Web Audio bus, gesture/visibility/lifecycle handling |
| `audio-ui.js` | Independent sound/music volumes and atmospheric-motion preferences |
| `theme.css` | Cosmic shell, readable surfaces, responsive battle/atelier layouts and ten aura treatments |
| `build.mjs` | Deterministic v8 assembly extension; builds production and isolated demo without publishing |
| `release.mjs` | Explicit file/fingerprint manifest; no network writes |
| `test.mjs` | Final suite runner with per-suite logs and exact artifact fingerprints |

The v3.0 simulation/rendering/studio source remains in `work/v8`; v2.9 social source remains in `work/v7`/`work/v6`. Builds need the imported scaffold. A verified v3.0 release snapshot is preserved at `baseline/v3.0` before the first v3.5 build.

```powershell
node work/v9/build.mjs
node work/v8/preview.mjs
node work/v8/package.mjs
node work/v9/test.mjs
node work/v9/release.mjs
```

Preview serves only isolated demo assets at `http://127.0.0.1:4174/`. Existing browser/PGlite dependency environment variables are described in the root README. PNG-download tests need Chromium permission to write its temporary download. Every browser test blocks the real backend; `--live` additionally allows only the public Pages origin for the isolated public smoke test.

## Data contracts

- `kme_nightfall(profile, action, team)` accepts read/join/leave/rally, never client damage amounts. Server triggers award only confirmed eligible new activity. Both device and character daily caps apply.
- `kme_auras(profile)` returns current ten-tier inventory, equipped choice and stardust.
- `kme_aura_action(profile, receipt, action, tier)` atomically distills/crafts/equips. Receipts bind profile, device, action and tier. A duplicate always leaves one copy. Crafting only creates a missing tier at its fixed price.
- Closed RLS tables are accessed through the existing admission guard and shared-character model. They are not individually authenticated player accounts. No direct client table grants were added.
- World/export wrappers retain all earlier fields. Foreign keys extend character deletion. Standings never return device IDs.

## Release evidence

The user explicitly authorized immediate publication after implementation. Prepare and verify locally first, apply the additive migration, then publish to the existing `TuureVvv-MAJORPATCH_1` branch with an expected-head lease and no force. The GitHub Pages run, applied migration version and public fingerprints belong in `outputs/DEPLOYMENT-v3.5.json`. Building or writing this README is not evidence of deployment.

The illustrated poster is `outputs/kme-v3.5-the-dark-side-of-nicotine-patch-notes.png`; its exact built-in generation prompt is recorded in `outputs/PATCH-v3.5-image-prompt.md`.
