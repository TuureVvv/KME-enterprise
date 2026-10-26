# v3.0 release validation — 26 October 2026

The user authorized publishing after the coherence and colour pass. This document records completed implementation tests; actual migration/Pages completion and public asset checks are recorded separately in `outputs/DEPLOYMENT-v3.0.json`. Testing used isolated fixtures and created no fabricated real crew records.

## Runtime evidence

**73 check groups passed on the current coherence/colour/live-session iteration**, including 750 weapon/modifier composition scenarios. The full runner writes `outputs/V3-LOCAL-VERIFICATION.json` only after every listed group passes; `outputs/V3-RUNTIME-LOG.json` keeps the individual outputs. The first demo’s 44-group verification is preserved separately in `baseline/v3-demo1/verification.json`.

| Suite | Groups | Evidence |
| --- | ---: | --- |
| `coherence-tests.mjs` | 4 | Stable clickable navigation and pin lifecycle; distinct district/building palettes and over 600 saved scenery draws; wall-clock heartbeats during frozen menus; exact production progress/start/pause RPC contracts with isolated mocked live repositories |
| `db-tests.mjs` | 5 | Additive migration reruns and start gates; paused nonce retry/long resume without combat credit; atomic clears/blueprint settlement and retry idempotence; 20% death retention/export; admission, device ownership, private RLS/grants and deletion cascade, with zero health reports |
| `engine-tests.mjs` | 13 | Sustained automatic firing with no heat state/lockouts; charge impacts at 30/60/144/240 FPS; real relay channels and manually called guardians; class abilities, splash/returning shots, sentry reposition/expiry, flooded movement, prototype recovery, overtime costs, Potency's return and deterministic/bounded assaults |
| `armory-tests.mjs` | 9 | 750 weapon/modifier compositions with real impacts and order-independent stats; hold/release/cancel, wall-clipped beams, hollow ring centres, status reactions and bounded fragments/echoes; shop stock/idempotence/gates/vouchers, research/backpacks, reward/vault blueprints, quiet-time threat and manual guardian, single Rig impacts at 30–240 FPS and new AI/bomb defusal |
| `browser-tests.mjs` | 9 | Deployment/practice; keyboard/top HUD; visible shop navigation and purchases; signal → guardian → extraction; lost confirmation retry; blueprint retained on extraction and absent after death; district/Chemist unlock, reload/export and navigation cleanup; twin-stick/cancel/gadget at 320×740, 390×844 and 844×390 |
| `armory-browser-tests.mjs` | 5 | Six stable rotating offers, voucher and research transactions; typed named map loot that clears on pickup; pause-safe charged beam and visible mouse reticle; manual guardian call; touch ring release/cancel and readable reward cards in all three phone orientations/sizes |
| `shop-browser-tests.mjs` | 6 | Five viewport layouts (1440×1050, 1366×768, 390×844, 320×740, 844×390); all desktop purchase buttons visible without scrolling; persistent balances/exit; working equip/install/recycle/build/reroll and scroll cleanup. Every catalogue purchase has a valid SVG, all 50 mod/15 weapon icons are mapped, and all four rarity surfaces/banners have distinct rendered colours |
| `studio-tests.mjs` | 8 | Zero and exact 0.1% opacity; pixel samples showing uniform 20% stroke joins; actual layer composition/reordering/visibility; undo of deletion/movement; five-layer draft recovery including names/order; downloaded lossless 2048×1536 PNG; delayed-close isolation and phone layer control sizing/overflow |
| `standalone-tests.mjs` | 2 | Single HTML loads the complete app/3D modules/atlas with no external asset or backend requests; repeated district rebuilds dispose old resources and a representative combat fixture renders without errors |
| Existing v7 browser suite | 8 | Noticeboard autosave/conflicts, chat/replies, wardrobe/profile appearance, combined rooms and 320–1920 px layouts preserved |
| Existing message reliability suite | 3 | Newer draft survives an older send, shared composers survive reload, explicit character selection and responsive wardrobe/reduced motion |
| Existing full-quality art recovery suite | 1 | Real touch strokes, IndexedDB close/reopen, immutable lost-response receipt/outcome, one publication/check-in and original recovery |

The main game browser suites recorded no browser errors or live group requests. Development browsers used isolated local fixtures. Playwright file routing supplied the generated local assets because sandboxed localhost connections are restricted. The complete local runner uses an approved browser execution for the drawing download that the sandbox otherwise cancels.

`outputs/V3-LOCAL-VERIFICATION.json` records the tested build fingerprint and suite counts. `node work/v8/verify.mjs` performs a separate static check and writes `outputs/V3-STATIC-VERIFICATION.json`; it does not pretend to rerun browser/game tests.

## Baseline and isolation

Every v8 build first reconstructs v2.9 and verifies all 20 historical website fingerprints, allowing only the existing unpublished-preview labels. It then creates separate demo JS/CSS and updates the demo HTML. After this step, the other **19 baseline files still match**. This includes the normal `app.js` and `index.html`, side-game assets, privacy copy, vendored dependencies and PWA files.

The new controller uses `KMEBlacksiteDemoSession`, which refuses any repository other than the current exact DemoRepository. It no longer invokes injected start/pulse/finish/cancel callbacks. Demo HTML loads no Supabase SDK or connection config and permits connections only to its own origin. Standalone HTML uses `connect-src 'none'`. Compact progression is in `DemoRepository.data.blacksite30`; it is included in demo export/deletion. No production schema or access policy was altered.

The local-only preview server binds to `127.0.0.1`, serves demo assets through an allowlist, and defaults to the demo. HTTP 200, demo entry selection, absence of the Supabase SDK/config and the loopback binding were checked. It is intentionally left running for the user's review; its PID/port are in `outputs/v3-preview-server.json`. `scripts/stop-v3-preview.ps1` safely stops that recorded instance.

## Review artifacts

- `outputs/kme-v3-demo.html` — self-contained browser demo.
- `outputs/kme-v3-local-demo.zip` — local demo package with entry HTML, notes and third-party notices/licenses. Not a production upload package.
- `outputs/previews/v3-deployment-desktop.png`, `v3-field-combat.png`, phone/landscape game screenshots, shop and unlock screenshots.
- `outputs/previews/v3-shop-rarity-icons.png`, `v3-shop-redesign-1366x768.png`, `v3-shop-redesign-390x844.png` and workshop screenshots show the current shop/rarity design. `v3-armory-loot*`, `v3-armory-map.png` and `v3-armory-combat.png` show reward and combat fixtures.
- `outputs/previews/v3-studio-layers.png` and `v3-studio-original.png` — layer UI and verified full-size output.

## Limits and next iteration

Progress is local to a demo browser/character. Production/cross-device progression and migration/rollout design remain separate work before any later authorized release. There is no saved unfinished combat world, multiplayer combat or fabricated live score. Four operative kits are implemented; the remaining suggested classes were intentionally not represented as playable placeholders.

Phone viewport and touch emulation were tested; physical device performance, audio balance and comfort still need hands-on review. Procedural art, gameplay balance and district density are ready for iteration, not claims of a large-studio art budget. Browser timings/receipts and a shared picker are not a complete anti-cheat system. The original reward caps and explicit nicotine consent remain distinct from combat progression.
