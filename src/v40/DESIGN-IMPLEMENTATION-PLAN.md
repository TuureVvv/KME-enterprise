# v4.0 — NO MORE AURA FOR U

Comprehensive product, game, economy and implementation plan · 27 October 2026.

## 1. Scope, authority and release

The direct request is to write a comprehensive plan, then implement the update, create an illustrated patch notes image and publish. The supplied `ok V3.6.txt` is the feature brief; the user's direct title **v4.0 — NO MORE AURA FOR U** controls its version/name. The imported app is already in this workspace. v3.5 is the current verified release; preserve its artifacts before rebuilding.

The user subsequently clarified that Night Shift should receive capped team credit for logging nicotine use, while Quitters receive credit for completed resistance check-ins. That direct clarification supersedes the earlier no-use-reward design decision. Reports remain optional and explicit. Rewards attach to reporting, never pouch quantity, dose, strength, purchases or money spent. No automatic game/timer outcome becomes a health report.

The currency recommendation is a one-time 1:1 merge of existing confetti and stardust, preserving earned balances while resetting collectibles. This is the working assumption unless the user chooses the offered full-wallet reset. The reset itself is explicitly requested. It must be transactionally archived and versioned, apply exactly once, and exclude characters, drawings, health records, scores, skins, banners and BLACKSITE unlocks.

## 2. The product structure

The current app spreads identity across Squad, Journey, Wardrobe, aura records and profile dialogs. v4 makes **My profile** the single home for those flows.

Primary navigation becomes:

1. **Overview** — the existing support-first front door, board and crew conversation.
2. **My profile** — identity, records, collection, customisation, journey and achievements.
3. **Play** — BLACKSITE, rotating arcade, Drawing Studio and Nicotine Singularity.
4. **Chat** — conversations, drawings, replies and optional reports.

My profile contains three clear local tabs:

- **Overview:** large character identity, faction, optional rank display, a compact record grid, best-loved retained drawing, recent timeline and achievements.
- **Collection & style:** aura collection/atelier plus the existing cosmetic categories and a persistent stardust balance. Secondary appearance categories stay inside this tab; they do not become another primary navigation row.
- **Journey & activity:** existing journey charts/guidance and a filterable timeline. Health sections only appear when the selected character's clock/consent permit them. Games-only characters get game/art/community activity without a health-score substitute.

A small **Crew directory** disclosure retains all Squad functionality: select/view/create/export/delete characters. It starts closed and never pushes the current profile below a grid of other people. Existing deep links and old navigation actions route to the appropriate profile tab rather than disappearing.

## 3. Profile design

Use an employee-pass hero: portrait on the left, nickname and rank in the centre, faction and stardust on the right. A restrained constellation background carries aura/rank effects. On a phone, identity comes first, followed by a horizontally scrollable three-tab row with large tap targets.

Keep six immediately useful metrics visible: highest expedition sector, best expedition score, safe extractions, hostile eliminations, drawings shared and respect received. Expand **All records** for longest expedition, cleared districts, capsule totals, aura diversity/resonance and community activity. Distinguish actual lifetime server totals from retained chat/history counts; never label a bounded feed count as a lifetime total.

The timeline merges real retained game results, artwork/posts and permitted check-ins, sorts by timestamp with stable IDs, loads a bounded page and supports Game / Art & chat / Check-in filters. No invented historical timestamps. The best-loved drawing is selected by actual respect count, then recency, and uses a preview; original artwork downloads only on request. Expired/deleted gallery bytes show an honest empty state rather than a broken image or a fabricated all-time winner.

## 4. Rank presentation

Keep every existing rank name and threshold. Add original KME shield/chevron emblems, six visual divisions across the existing rank ladder, colour, metallic edging and increasingly elaborate wings/stars. Do not copy another game's rank art.

Higher divisions add a slow halo or a small orbital flourish, never flashing. Rank and collectible aura are separate layers. A **Show rank on my profile** preference lets a person choose whether to display the badge. Games-only participation remains clearly labelled and never receives a fake nicotine-free rank. Reduced motion freezes decorative movement without removing badge detail.

## 5. Stardust becomes the one cosmetic currency

Use the existing authoritative cosmetic wallet as the stardust wallet to preserve every wardrobe purchase and earning receipt. Merge the old aura wallet into it exactly once. Old clients/RPCs remain compatible; no second spendable balance remains.

Sources remain bounded confirmed participation: qualifying games, original artwork and the existing optional resistance earning route. BLACKSITE also shows its stardust reward prominently in the result and awards bounded sector-completion bonuses. Scores can grow without limit while currency rewards remain bounded; these are different economies.

Stardust buys existing wardrobe items, specified missing auras and optional contribution donations. It never changes a BLACKSITE weapon's damage, player health, enemy difficulty or nicotine rank. Every spend has a visible price, atomic balance check, receipt and retry semantics. No paid rolls, trading or cash value.

## 6. The collectible reset

This is an intentional new collection season, not an accidental loss:

- Store a private per-character release archive containing old collectible quantities, equipped collectible and wallet balances.
- Record a singleton reset epoch so rerunning the migration cannot reset anyone twice.
- Clear all collectible aura copies and equipped collectible auras. Preserve non-aura cosmetics and all other app records.
- Old pending aura receipts must not restore the old collection or spend against outdated rules. New actions include the new collection epoch; an old action asks the user to refresh.
- Isolated demo storage performs its own once-only epoch migration, without touching live data.
- New profile/collection copy explains the season reset and where to earn fresh capsules. Do not announce that old drawings or characters were reset.

## 7. Honest capsule odds and more auras

Keep ten rarity tiers but expand the visible pool to **24 original named auras**, with multiple variants in most tiers. Each normal capsule independently rolls a rarity from exactly one million integer outcomes:

| Rarity | Outcomes | Probability |
| --- | ---: | ---: |
| Common | 450000 | 45% |
| Uncommon | 250000 | 25% |
| Rare | 140000 | 14% |
| Epic | 80000 | 8% |
| Legendary | 40000 | 4% |
| Mythic | 20000 | 2% |
| Astral | 10000 | 1% |
| Ethereal | 6000 | 0.6% |
| Void | 3000 | 0.3% |
| Aether | 1000 | 0.1% |

Then uniformly choose a named variant within that rarity. The interface shows both rarity odds and the selected variant's conditional share. Greed no longer filters low rarities; no hidden modifier, pity system or crafting changes these displayed roll probabilities. Use server cryptographic random bytes with rejection sampling, not a biased remainder of a random integer. Verify every bucket boundary deterministically and run a large isolated distribution smoke check with a stated statistical tolerance; do not promise exactly one rare outcome in every fixed number of draws.

Legacy game results must pass through the same v4 reward finalizer so older open clients cannot refill the old inventory under old conditional odds. Each run rolls once, saved to its settled receipt. Retries return those same named auras.

## 8. Duplicates worth keeping

Copies strengthen **visual resonance**, not combat:

- 1 copy: original aura.
- 3 copies: second orbit and Resonance II.
- 6 copies: additional satellites and Resonance III.
- 10 copies: brighter signature/expanded profile constellation and Resonance IV.
- 15 copies: masterwork corona and Resonance V.

Each card shows copies, current resonance, next threshold and what distilling would remove. Distill yields are deliberately small: `[1,1,2,2,3,4,5,6,8,12]` stardust by rarity. Always preserve the final copy. A confirmation is required when distilling would cross a resonance threshold downward; normal duplicate distilling remains quick. Crafting only makes a specified missing visible aura and uses a displayed fixed price. Signature auras cannot be crafted or distilled.

## 9. Hidden signature auras

Prepare **six original signature auras**, excluded from the shop and normal public collection catalogue until discovered. Each rotating Singularity theme has one signature and a small original clue/object on an appropriate app surface: the board, observatory/profile, game library, artwork, faction panel or studio controls.

Availability is checked by the server in Helsinki time and changes with the current theme. It is not always present. An admitted character with meaningful recent game/art participation can inspect a clue during its active window. There is at most one eligible roll per character and device per Helsinki day, using a bound receipt and a genuinely rare fixed chance disclosed on inspection. No currency is spent for a random attempt. Repeated clicks, profile switching, client-clock edits and changed request parameters cannot grant more attempts. A hidden entry appears in the collection only after it is earned.

The target tuning is 1 in 128 per qualified inspection, with limited daily windows. These are long-term discoveries, not items needed to complete the catalogue. The normal 0.1% Aether probability is entirely separate. Discovery copy must not imply an item was owned before the server confirms it.

## 10. Nicotine Singularity replaces the Nightfall name

Rename visible Nightfall copy throughout the app to **Nicotine Singularity**, including the Play battle panel, profile faction, rules and achievements. Preserve stable database identifiers for compatibility. Both factions remain Quitters and Night Shift; affiliation is voluntary and is never inferred from a report.

Each operation lasts one Helsinki Monday–Monday week, with six maintenance-free themes looping by week index:

1. **Procurement Eclipse** — copper/black, an expense-eating singularity.
2. **Ratellite Uprising** — cyan, a rogue orbital payroll network.
3. **Violet Audit** — violet/ivory, a cosmic paper-trail tribunal.
4. **Drowned Dividend** — teal/amber, an underwater debt engine.
5. **Niko Event Horizon** — rose/indigo, an exceptionally inadvisable portal.
6. **The Last Smoke Break** — pale gold/navy, the final after-hours board meeting.

The hero, boss title, accent, small illustration details and achievement crest vary. Rules remain comparable. A completed operation is finalized once on a subsequent admitted read/action, so no weekly manual task or paid scheduler is needed. The next operation appears immediately. Roster normalization remains explicit and late joins remain prorated.

## 11. Reporting credits — clarified by the user

Add an explicit **reporting credit** route: 2 team damage for each of the first five qualifying check-ins per character **and device** per Helsinki day. A Night Shift nicotine-use report qualifies; a Quitters explicit resistance report qualifies, including the existing completed coping-flow action. An explicit resistance report can also count for a Night Shift member who resisted; reporting improvement must never be less valuable than reporting use.

- The daily five-report allowance is shared across qualifying report types, not five of each.
- Dose, number of pouches, strength and purchases do not change credit.
- A craving alone does not pretend resistance happened. The completed resistance action is required.
- The existing overall team daily cap still applies, so reporting is one contribution route alongside games, art, Rally and popular posts.
- Reports require actual existing privacy/character consent and remain self-reports. Never record or infer a result on another user's behalf.
- Explain this as credit for honest logging, with no instruction to use nicotine to help the faction. Extra use reports can still be recorded honestly without extra competitive credit.

## 12. Spend stardust to contribute

Two clearly labelled voluntary sinks:

- **Singularity contribution:** 10 stardust → 1 team damage, up to 10 donated damage per character/device/day, within the existing total daily team cap.
- **Original shared crew boss:** 20 stardust → 3 shared boss damage, up to 15 donated damage per character/device/day while its damage phase is open. Finale play-time requirements cannot be purchased.

Show the exact exchange, remaining allowance, available balance and affected event before confirming. If the operation rolls over, the balance is not spent against an unexpected new event; bind each donation receipt to the displayed operation/campaign. No donation changes BLACKSITE combat or health ranks.

## 13. Weekly achievement rewards

Winning faction members with an actual nonzero contribution receive the theme's permanent achievement crest. Ties receive a distinct shared-orbit achievement. Joining with zero contribution cannot claim a winner badge. Awards are idempotent per week/profile and included in export/deletion. Past operations/awards are readable in My profile; the current Play panel shows time remaining and the previous result. Rewards are prestige only, with no cash or competitive combat advantage.

## 14. BLACKSITE: one continuous expedition

The four districts become a connected expedition, with a new **sector** counter:

`Yard → Drowned Works → Violet Archives → Executive Blackout → next circuit`

Defeating a district guardian secures that sector checkpoint and automatically starts a visible transit countdown. The build, weapons/mods, backpack, scrap, materials, perks, player resource ratios, elapsed time, score and kill totals carry forward. During the transit window, the player can choose to extract; otherwise transit happens automatically. Finishing sector four continues into circuit two with escalating contracts/difficulty. The run ends through voluntary extraction, defeat or retreat, not the first boss or an arbitrary timer.

The countdown starts only after the guardian's real final form is defeated; Mr. Potency's first form never advances a sector. Menus pause transit. An unconfirmed live sector checkpoint pauses at the exit with retry/reconnect rather than skipping or duplicating a district. Practice uses the same flow without any network or progression writes.

## 15. Build carry, upgrades and balance

- Preserve core build identity. Never strip a successful first-floor weapon merely to manufacture difficulty.
- Each sector raises enemy health/pressure by a district/circuit curve, introduces distinct enemy roles and stronger elite mixes, and refreshes rewards/shop stock.
- Add a **field calibration** upgrade per weapon: visible cost in run scrap/parts, increasing base power by a fixed factor. This is expedition-only, separate from stardust. Later-sector supply/cache rewards provide the resources required to keep pace.
- Requisitions remain meaningful after earlier perk caps: extend the available investment ladder to eight levels and include calibration/material rewards. Do not show an empty choice menu after a strong build fills its first perks.
- Carry HP and shelter condition proportionally into the new sector with a small arrival supply allowance, rather than granting a free full heal. The player can spend run resources on repairs.
- Keep projectile/fragment/entity budgets, fair attack tells, ward single-impact rules and mobile frame-time bounds. Exponential pressure is bounded numerically; competitive progression can continue without producing NaN/Infinity.
- Normal-run score has no arbitrary 10,000-point or elapsed×24 ceiling. Use integer competitive records separate from bounded social/capsule/currency rewards. Show actual raw score, retained score and sector/circuit on results and leaderboards. Technical safe-number/storage validation is not a gameplay score cap.

## 16. Four district objectives with boss identity

The old three identical channelled uplinks are replaced by mission-specific tasks:

| District | Mission | Interaction and risk | Guardian payoff |
| --- | --- | --- | --- |
| Mossline Yard | Seismic triangulation | Activate three ground probes in a shown sequence; each reveals a burrowing patrol/tremor zone | Track the Mortgage Mole and call it from the marked fracture |
| Drowned Works | Drain the contaminated works | Recover a valve fuse, hold a pump perimeter, then flush the sludge lock | Remove the Director of Waste's containment seal |
| Violet Archives | Break the audit encryption | Recover three differently marked evidence pages, deliver them to the archive terminal and survive redaction drones | Force the Approval Committee into an exposed hearing |
| Executive Blackout | Cut the board's power | Destroy shielded external power cells, reroute the emergency breaker and disable the executive lockdown | Summon Mr. Potency's two-stage final review |

Mission state is data-driven where common, with explicit small interaction modules for different objective behaviour. Each district has task names, typed icons, HUD progress, map destinations, prompts and a clear guardian-call condition. Movement/firing/damage cancel tasks only where a channel is actually required. Guardian readiness leaves real looting time before the deliberate call, preserving the previous scavenging improvement.

## 17. Atmosphere and enemy ecology

Distinct terrain/light/weather props and enemy pools:

- Yard: pale industrial daylight, rust, seismic markers, burrow tracks; skitters, stalkers and breachers.
- Drowned Works: storm-blue lighting, water lanes, rain streaks/pump machinery, warm beacons; spitters, sludge carriers and coil drones.
- Archives: violet twilight, ivory archive columns, suspended scanning lines and evidence markers; surveyors, snipers, insurers and an audit drone variant.
- Executive Blackout: charcoal/crimson emergency lighting, spotlights/power pylons and periodic blackout pulses with readable hazard warnings; reapers, foremen, elite lancers and executive wardens.

Add original enemy variants with distinct silhouette/colour and real behaviour differences, not only extra HP. Keep ambient rats, allied rats and hostile rats unmistakably different. Decorative weather uses bounded instanced/recycled objects, respects quality/reduced-motion preferences and never conceals attack telegraphs.

## 18. Brush smoothing

Add a **Smoothing 0–100** slider next to brush size/opacity. Zero bypasses filtering exactly. Positive values use a distance/time-aware stabilizer to smooth jitter, with the final pointer-up point flushed so strokes do not end short. Brush/pencil/eraser share the setting; shapes, fill, layer movement and pan stay exact. Preserve constant-opacity stroke masks, mirror/pressure, pen cancellation, undo, full-resolution PNGs and layer recovery. Save the preference in draft metadata/device options and recover older drafts with smoothing off.

## 19. Easier drawing likes

Every drawing preview in Overview, full Chat, a reply/thread and the profile showcase gets a visible, labelled **Like / Liked · count** action with a large touch target. Reuse the existing respect vote and permissions; there is one vote per device, no self-voting and no second drawing-only reaction ledger. Counts update after confirmation; failed requests preserve the prior state. Preview/original buttons remain separate from liking so a tap cannot accidentally download a full image.

## 20. Technical work map

Create readable `work/v10` modules over the existing v9 builder. Preserve v3.5 root hashes and deployment metadata in `baseline/v3.5` before building. Do not mutate generated JavaScript by hand.

1. Pure catalogue/economy/season rules and deterministic tests.
2. Transactional release epoch/archive, unified-wallet APIs, named aura inventories, fixed-odds finalizer, signature attempts and receipt compatibility.
3. Faction reporting credits, donations, six themes, weekly finalization and achievement APIs.
4. Bounded profile summary/timeline/best-art RPC and equivalent isolated demo adapter.
5. Profile/nav/customisation integration, new collection UI, rank art, drawing like controls and responsive CSS.
6. BLACKSITE engine/controller/renderer extension with continuous transit, sector mission data, build preservation, calibration, distinct pools/atmospheres and uncapped competitive records.
7. Sector/checkpoint/settlement RPCs and authoritative compact progression; preserve legacy API compatibility and old scores.
8. Studio smoothing, recovery/pixel checks and mobile input validation.
9. Integration tests, visual review, honest release notes/poster, cache/version change, then production migration and leased GitHub Pages publication.

Use closed private tables with RLS/direct grants revoked, explicit admitted RPCs with empty search paths, device-bound receipts and existing shared-character semantics. No actual friend records are fabricated for tests. Profile export/deletion includes all new records; archives contain only data necessary for the requested economy reset.

## 21. Verification gates

- Reset/merge: seeded old balances and auras, rerunnable migration, exactly one reset, archive availability, preserved unrelated data and stale-receipt rejection.
- Economy: unified earning/spending, concurrent/retried actions, no negative balance, small distill yield, last-copy/resonance protection, named crafting and hidden-catalog exclusion.
- Odds: exact million-outcome bucket boundaries, unbiased integer sampler, named variant selection and a large isolated statistical smoke check. No live test rolls.
- Factions: five shared report credits per day, exact faction/consent semantics, both character/device caps, no dose weighting, donation cost/caps/rollover binding, six-theme cycle and one weekly achievement award.
- Profile: navigation/deep links, all three tabs, current character versus directory, clock-off privacy, labelled stats, real best retained artwork, bounded timeline and like actions across all surfaces.
- BLACKSITE: full four-sector/circuit progression, preserved builds/resources, guardian final forms, actual mission differences, calibration/pressure, no score clipping above 10,000, paused/retried transitions, defeat/extraction accounting, distinct enemy behaviour and bounded rendering.
- Studio: smoothing zero exactness, measurable jitter reduction, flushed endpoints, opacity and layer regressions, persistence and touch/pen cancellation.
- Desktop 1366/1440 and phones 320/360/390 portrait plus landscape; inspect screenshots, focus, safe-area controls and reduced motion.
- Existing social/drawing/game regression suites adapted only where the deliberate v4 product behaviour changes. Preserve assertions for functionality that remains.
- Final local proof records artifact fingerprints. Apply the reviewed migration, publish the exact tree with an expected-head lease and no force, verify Pages success/public hashes/API gates and play the public isolated demo without backend test writes.

## 22. Release deliverables and practical limits

Deliver the plan, implementation/source, accurate patch notes, an original illustrated poster and verified live URL. Update the handoff with the actual migration/commit/Pages identifiers. Keep prepared/local/deployed status distinct.

This remains a private friend-group app with shared character selection, not individual-account anti-cheat. Competitive records can validate device tickets, order and receipt timing but cannot prove every client-rendered hit was honest. No promise of production AAA graphics, unlimited provider capacity, guaranteed rare drops or physical phone testing is made. Progress, support, art and readable controls take priority over visual clutter.
