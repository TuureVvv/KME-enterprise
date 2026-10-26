# BLACKSITE v3.0 — coherence and feel pass

Authorized 26 October 2026: design, implement, test, then publish the accumulated v3 update to the existing live app. This supersedes the earlier demo-only release restriction. Preserve existing crew records and the rest of KME.

## Findings and design

The game has enough equipment. Its weakest moments are finding the next useful action, understanding what an action changed, returning from menus, and distinguishing the world at a glance. The current renderer also gives buildings, roads and props similar green values. Address these before adding another content system.

1. **One readable expedition flow.** Add a compact phase/task strip: Scavenge → Link signals → Call guardian → Extract. Explain the current phase and the next action in ordinary language. Show progress, quiet time and manual guardian readiness without competing notification blocks. Keep optional vaults visibly optional.
2. **Navigation that remembers intent.** Turn the tactical map into a usable list of signals, unclaimed building rewards, dropped equipment, Bongo and extraction. Let the player pin one destination; show its distance and waypoint until reached/claimed, then clear it. Offer “nearest reward” without searching the map. The initial objective is readable even before the player learns the letters.
3. **Less friction around rewards and loadouts.** Keep loot decisions paused; state exactly where an upgrade goes. Add immediate stat comparisons in the shop and show the current build by modifier family. Explain charge/release weapons whenever equipped, not only in the manual. Preserve menus and input cancellation consistently.
4. **Feedback with a clear visual language.** Red/orange means incoming danger; cyan means stamina/control; warm ivory means useful world interaction; rarity colours mean equipment. Show local damage direction and blocked/critical feedback. Give every weapon its own synthesised sound character and expose optional, bounded touch vibration. Respect mute/reduced motion.
5. **Colour, contrast and place.** Neutral concrete, rust and warm amber in Mossline; cold slate/blue water with copper machinery in Drowned Works; desaturated stone with lavender/cobalt archive fixtures; charcoal/steel with hot vermilion and amber in Executive Blackout. Give buildings distinct paint and warm floor/interior lighting. Use neutral main light and fewer green overlays. Preserve KME lime as an accent, and keep rarity colours distinct from hostile markers.
6. **Performance is part of feel.** Instance repeated static world meshes by material/geometry while keeping roofs, fading walls and animated objects separate. Keep effect/entity budgets, disposal and performance mode. Verify draw-call reduction and rebuild/resource bounds with real rendered fixtures.
7. **Live progress that feels dependable.** Replace the demo-only entry restriction with a repository adapter that explicitly supports the existing admitted live repository and isolated demo. Persist only compact clears/blueprints/records on confirmed settlement. Keep device ownership, admission, nonce retries, extraction/death retention and score caps. Paused menus need a wall-clock heartbeat without earning finale combat time. Preserve retry receipts and export/deletion. Do not migrate demo records into real crew profiles.

## Implementation order and acceptance

Implement colour/performance, navigation/feedback/loadout, then production session/backend integration. Keep the existing v3 content and drawing fixes. Add focused tests for pin lifecycle, menu input/heartbeat, purchase comparisons, shared live/demo contracts and palette/draw-call differences. Run existing game, drawing, social and isolated database regressions. Validate the exact live package, apply only the additive tested migration, publish against the freshly verified Pages branch head, and verify deployed assets and Pages completion. No fabricated live plays, drawings, messages or nicotine reports.

## Release boundary

Use the existing GitHub Pages branch `TuureVvv-MAJORPATCH_1` and Supabase project `amuvikkddeeckhtimhht`, rechecked against the v2.9 baseline before work. Include only intended website/source/migration files. Never upload local receipts, tools, credentials, browsers or test runtime data. Keep old client RPCs working during rollout. Physical phone comfort and audio balance remain manual follow-up checks; emulation is not a physical-device test.
