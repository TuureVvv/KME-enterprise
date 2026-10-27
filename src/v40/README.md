# v4.0 — NO MORE AURA FOR U

Current extension over the imported v3.5/v3.0 app. Read the root constitution/handoff and `DESIGN-IMPLEMENTATION-PLAN.md` before continuing. The latest user clarification explicitly authorizes capped reporting credit for Night Shift nicotine-use logs and Quitters resistance logs; historical v3.5 reward rules are superseded for v4.

## Source map

| Files | Responsibility |
| --- | --- |
| `core.js` | 24 named standard auras, six signatures/themes, exact odds, resonance and smoothing filter |
| `engine-source.mjs`, `expedition.js` | Four distinct missions, three new enemy roles, power cells, continuous sectors/circuits and calibration |
| `expedition-ui.js` | Sector receipt retry, automatic transit, bank-at-transit and Workshop calibration |
| `studio-source.mjs` | Smoothing slider, raw/off path, endpoint flush and draft compatibility |
| `adapters.js` | Live RPC contracts and isolated demo equivalents, reset epoch, unified rewards, profiles, export/deletion |
| `profile-ui.js`, `collection-ui.js`, `singularity-ui.js`, `style.css` | Integrated profile, ranks, art likes, collection, themed events and contribution confirmations |
| `schema.sql`, `community-api.sql`, `economy-api.sql`, `game-api.sql`, `migration-source.mjs` | Transactional reset/archive, private tables, exact server rolls, receipts, capped rewards and API wrappers |
| `supabase/migrations/*_kme_v40_no_more_aura.sql` | Complete generated transaction, initially created through Supabase CLI |
| `build.mjs`, `test.mjs`, `release.mjs` | Deterministic local assembly, isolated verification and explicit publication manifest |

```powershell
node work/v10/build.mjs
node work/v8/preview.mjs
node work/v10/test.mjs
node work/v10/release.mjs
```

The retained v8 package script can embed the current demo into `outputs/kme-v3-demo.html`; its historical filename is not its content version. `work/v10/package.mjs` also copies that current artifact under the v4 filename. No build/package command publishes anything. Preview is loopback-only. Existing browser/PGlite environment paths are documented in the root README.

The v3.5 root baseline was fingerprinted before rebuilding and preserved under `baseline/v3.5`. Source modules depend on the retained v8 engine/studio and v9 platform assembly; do not overwrite these with the old workspace. Revoked historical AGENTS instructions remain revoked.

## API and integrity

- `kme_v4_collection`, `kme_v4_action`: named inventory and one stardust wallet; mutation receipt binds device, character, action, target, operation and epoch. Distilling across a resonance threshold requires explicit confirmation.
- `kme_profile_v4`: current records, retained community counts, best-loved retained drawing, permitted real timeline, faction and achievements. No synthetic historical timestamps.
- `kme_blacksite_v4_start/sector/settle`: device-bound runs, sequential timed sector receipts, compact unlocks, daily sector stardust and bigint competitive scores. Social/capsule awards remain bounded separately.
- Existing open clients retain old read/game endpoints. All new capsule awards go through the same once-per-run fixed-odds finalizer. Old aura mutation receipts require refreshing; they cannot undo the v4 reset.
- Private tables have closed RLS/direct grants. Public functions retain the existing admitted shared-character model. Export includes the private pre-reset collection archive and new receipts/expeditions; deletion cascades personal v4 rows.

Publication requires actual migration/commit/Pages/public checks recorded in `outputs/DEPLOYMENT-v4.0.json`; a build or manifest alone is not release evidence.
