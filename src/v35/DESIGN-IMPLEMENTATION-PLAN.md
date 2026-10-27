# v3.5 — The Dark Side Of NICOTINE!

Design and implementation plan · 27 October 2026 · authorized for publication by the user.

## Intent and interpretation

The supplied `USER-BRIEF.txt` is the feature brief, not an independent source of authority. The direct request is to design, implement, test, publish and make an illustrated patch note image. The existing constitution, real crew data and all v3.0 games remain the foundation.

This is a platform update: competition, collectible identity and a polished atmosphere. BLACKSITE remains the permanent main game. The familiar Overview / Squad / Play / Chat / Journey layout stays recognizable. The three support actions remain the first useful controls on a phone.

One deliberate change to the brief: nicotine consumption, pouch counts and nicotine strength never earn damage, currency or prestige. Mandatory team disclosure and a combat multiplier based on health reports would contradict the app's quitting purpose and optional participation. Teams are voluntary affiliations, not verified health labels. Momentum comes from participation rather than abstinence, so an honest use report cannot hurt a team. Existing optional health logging stays separate.

## 1. Team Battles: the weekly Nightfall operation

Two crews attack their own side of an original cosmic boss, **The Nicotine Singularity**, a dysfunctional procurement department that has achieved gravitational collapse.

- **Quitters / Rehab:** cyan, orbital shield emblem, "One minute further."
- **Night Shift / Nicotine Users:** amber, eclipse emblem, "Still here. Still in the fight."
- Players choose, defer or spectate. Affiliation does not turn on tracking or record an outcome. Existing characters receive an optional invitation, never an automatic assignment.
- A Helsinki Monday–Monday operation provides a fresh contest without resetting existing campaign progress. Membership is fixed for the week after joining; a member can leave and hide the affiliation, but cannot change sides until the next operation. Old receipts retain their original attribution.
- Both teams retain raw damage and per-member contributions. The primary comparison is completion percentage against **60 HP per roster member per remaining Helsinki day**. A late join adds only the remaining days to that team's target. Show raw damage, target, roster size and the exact formula; never silently divide by an arbitrary "balance" multiplier.
- An empty team shows "Recruiting", not a loss or a fictitious score. Both teams can defeat their boss; the contest compares completion, with ties clearly shown. Previous operation results remain readable.

### Contribution economy

Only server-confirmed activity creates a receipt. No arbitrary client-supplied damage endpoint exists.

| Action | Base damage | Daily limit |
| --- | ---: | ---: |
| Bank a qualifying played game | 10, with participation momentum | 3 |
| Publish original Drawing Studio art | 10 | 1 |
| Optional explicit consented resistance report | 5 | 1 |
| Clock in to the operation using Rally | 5 | 1 |
| A new post earns three distinct other-device votes | 10 | 1 |

Momentum adds 5% per earlier active day in the current operation, capped at 1.35×. All routes share a hard 60-damage daily ceiling per character **and device**. No historical activity is backfilled. Health use/craving reports generate no competitive receipt; craving support remains available without competition. Games-only members can reach the ceiling using the non-health routes. Popular-post credit excludes the author's device and is awarded once, not on every vote toggle. Repeated network requests cannot duplicate Rally or any other credit.

### Presentation

Put a compact operation strip below support actions on Overview; put the complete battle panel above the games on Play. The battle panel has a two-column versus layout on desktop, stacked teams on phones, labelled meters, contribution routes and a roster. "Join / Rally / View standings" are distinct actions. A small original procedural black-hole illustration sits in the hero, with no canvas loop or image download needed for this interface.

## 2. Auras: make the collection part of the character

Keep all ten existing tiers and inventories: Common, Uncommon, Rare, Epic, Legendary, Mythic, Astral, Ethereal, Void and Aether. Preserve capsule odds, existing awards and equipped choices.

- Add an **Auras** tab to the existing wardrobe. This is the primary collection home, with a shortcut from old capsule records.
- Every owned tier supplies an avatar aura, a matching profile backdrop and a tier-specific signature. A profile can show its aura throughout Overview, Squad, Chat, picker and profile details. This is expressive utility, with no combat advantage or team multiplier.
- Common: clean halo; Uncommon: twin orbit; Rare: blue arcs; Epic: violet constellation; Legendary: golden rays; Mythic: rose sparks; Astral: teal satellite orbit; Ethereal: layered pale waves; Void: violet eclipse; Aether: luminous prism corona. All show a written rarity name and a recognisable silhouette, not just colour.
- Higher tiers are visually richer but bounded: CSS transforms/opacity, no unbounded particle systems. Reduced motion makes them static. Decorative layers are behind the avatar and never intercept input.
- **Atelier:** distill duplicate copies into stardust while always preserving the last copy and equipped aura. Spend stardust on a specified tier with a visible fixed price. This gives duplicates a useful, deterministic purpose. No cash, trading or paid random rolls.
- Distill yield: `10 × (tier + 1)`. Craft prices: `[20,35,60,100,160,240,360,520,760,1200]`. Crafting only missing tiers prevents accidental spending on duplicates. Every mutation uses a unique retry receipt and an atomic server transaction; the receipt binds the action and tier.
- Collection count, equipped state, costs and insufficient material messages stay visible. A preview can show locked effects without equipping them. A free "none" option removes an aura.

## 3. Visual direction: after-hours observatory

Replace the all-over olive wash with near-black navy, warm ivory text, cyan, violet and small amber accents. Retain lime for established support actions and the KME wordmark. Surfaces are calm and opaque enough for legible text. Use the existing local font stack; no external font dependency.

- Add a sparse CSS star field, a slow orbital glow and an eclipse at the far edge of the shell. They are decorative, behind content and stopped for reduced motion, hidden tabs and active game mode.
- Improve page titles, text widths, card spacing, separators, input surfaces and focus rings. Keep the current navigation and content ordering.
- Add button/link press, hover and keyboard-focus feedback with a short transform/colour transition. Use touch-friendly sizes. Exclude drawing canvas and game controls from generic movement effects.
- Preserve user banners as intentional identity surfaces. Team colour and aura colour remain independent; neither overwrites an existing cosmetic.
- Include an Effects preference that can stop decorative motion separately from system reduced motion. No flashing, forced motion or sound on arrival.

## 4. Minigame sound

Create original synthesized music rather than external tracks. A single bounded Web Audio music bus handles BLACKSITE, rotating arcade and TWEAKMAX. Independent **Music** and **Effects** toggles and volumes persist on the device; all start muted until enabled with a user gesture.

- BLACKSITE: low industrial pulse with a minor-key arpeggio; a quieter variant for menus/scavenging and a more urgent rhythm for combat.
- Rotating arcade: playful space-funk sequence.
- TWEAKMAX: light, quick synthetic percussion, with hit/mistake/score accents.
- Game visibility and real active state determine playback. Pause, backgrounding, navigation, game destruction and completed runs suspend the bus. One shared context, bounded scheduled voices, no autoplay requests, no stacked timers after replay.
- Respect BLACKSITE's existing effects toggle. Add a clear shared audio-settings entry in Play and inside the game options. Display actual saved volumes and allow either music or effects independently.

## 5. Implementation boundaries

1. Preserve a verified local v3.0 baseline before rebuilding. Use new readable `work/v9` modules and an explicit build/release layer over the existing v8 assembly; don't hand-edit generated output.
2. Add private team membership, contribution ledger, aura-wallet and action-receipt tables with RLS and no direct client grants. Use existing admitted RPC guard and shared-character trust model; do not pretend it proves individual identity.
3. Attach contributions to existing confirmed cosmetic-earning/game/art/report records and vote thresholds. Lock receipt/cap/character mutations to make retries and concurrent devices safe.
4. Extend the world snapshot with compact public-to-admitted affiliation/aura metadata. Use an independently loaded bounded standings RPC for the full operation. Keep old world fields and old RPCs valid for open clients.
5. Extend export; use profile foreign-key cascades for deletion. Do not expose private device IDs in standings. Keep real crew records out of fixtures and release artifacts.
6. Implement equivalent isolated DemoRepository behaviour; demo activity never calls Supabase. Tests use only fixtures, a local PostgreSQL runtime and mocked live adapters.
7. Update release notes, privacy explanations, cache version and service worker. Cache only public assets. Old clients keep their existing functionality during the additive backend rollout.

## 6. Verification and release criteria

- Pure scoring tests: daily caps, per-device cap, momentum, week/timezone boundary, late join target, roster locks, ties and empty teams.
- Isolated SQL tests: rerunnable migration, admission gates, concurrent/retried receipts, vote anti-farming, no use-report reward, aura last-copy protection, craft spending, equipped preservation, exports/deletion and private grants.
- Browser flows: join/defer/rally, two-team standings, aura preview/equip/remove/distill/craft/retry, profile appearance, sound gesture/mute/pause/replay, and errors. Cover 360px portrait, phone landscape and desktop; inspect screenshots and keyboard focus.
- Run relevant v3.0 BLACKSITE/shop/studio and social reliability regressions, ensuring no live backend requests.
- Publish the additive migration only after local tests, then the exact verified website/source tree to the existing GitHub Pages branch using a lease against its current head. No force push. Verify Pages success and public asset hashes, plus denied unauthenticated new RPCs. Never create fake live posts, nicotine reports, games or purchases as a smoke test.
- Create the patch notes poster from the final implemented features, inspect its wording and save it in the workspace. Record deployment evidence and update the current handoff.

## 7. Explicit limits

This is friendly competition using the existing shared-character model, not a secure individual-account tournament. Auras have expressive utility, not health or combat power. The older crew boss/finale remains available as a legacy shared operation. No nicotine dose calculator, consumption rewards, real money, forced health disclosure, external music service or destructive data migration is included.
