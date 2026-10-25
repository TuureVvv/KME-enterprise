## Current integration: v2.9 quality of nicotine free life update

Read AGENTS.md and RELEASE-PENDING.md first. Use work/v7/build.mjs and work/v7/package.mjs; the v6 scaffold alone removes the current quality integration. Details: work/v7/DEVELOPER.md (repository: src/quality/DEVELOPER.md). BLACKSITE remains permanent. Scheduled arcade builds stay unpublished until directly released by the human. Preserve the permanent noticeboard, shared wardrobe, Chat/Play routing and opt-in notifications.

# KME arcade and BLACKSITE developer handoff

**Release rule superseding all automatic deployment language below:** Read workspace AGENTS.md and RELEASE-PENDING.md first. Develop/test locally and mark accumulated work pending. Only a direct human publish/upload instruction or a new-version release announcement authorizes uploading all pending application work. A heartbeat or an agent-generated version does not authorize publishing, live migrations, pushes or activation. Scheduled winners remain local and pending; keep the existing side game active until the user releases them.

This release: **v2.2 — time to chat out the nicotine**. The internal database protocol is 6; never present that as the user's patch version. Historical names supplied by the user are **v1.0 major start** and **v1.5 tweakmax**. Every future update needs a signature patch name and a version increment. Maintain `work/v6/patches.json`, the embedded patch banner and the patch history together.

## Permanent main versus rotating side game

**BLACKSITE: Shelter Shift (`blacksite`) is permanent. Never rotate it out or replace its registry entry when publishing a ballot winner.** The side cabinet starts with `smoke-break`; only `kme_private.arcade_config` identifies the current rotating game. The server always permits permanent BLACKSITE independently of that config. Tweakmax / Urge Breaker is a third, separate quick game. Earlier games keep their individual scores and game-history entries in the library; archived builds need not be current to keep their records.

The user wants BLACKSITE to grow into a complex game. It must be genuinely hard when played greedily: distinct attacks, timing, resource decisions and serious loss, with powerful feature combinations available to discover. Endless pressure should eventually overwhelm ordinary builds. Avoid shallow speed-only scaling. The rotating cabinet can be a lower-investment, shorter game; keep it polished and mechanically distinct.

## Sources and checks

Crew Chat shipped in v2.1; Common Room and full-quality Drawing Studio ship in v2.2. Read `CREW-CHAT.md`. The `chat.sql` (v2.1) and `v22.sql` (v2.2) migrations are required before their respective clients; its public RPCs enforce private admission, bounded retention and consent. `chat.js`, `drawing.js` and `chat-style.css` are integrated by the v6 build. Preserve the BLACKSITE improvements, the current side cabinet and existing player data in subsequent work.


BLACKSITE v2.1 source additions: `shop-visuals.js` supplies item infographics, and `visual-effects.js` supplies pooled attack effects and individually named boss HP badges. `compose-renderer.mjs` includes both renderer fragments; `build.mjs` includes the shop guide. Use `build.mjs --pending` and `package.mjs --pending` for an explicitly unpublished, self-contained `outputs/blacksite-pending-preview.html` without replacing release aliases/manifests. Never ship the pending-label build; rebuild normally only after a human release instruction. Run `pending-engine-tests.mjs` and `pending-browser-tests.mjs` alongside the existing relevant suites. See RELEASE-PENDING.md for the cumulative release queue.


The workspace sources are `work/v6/`. `engine.js` is the pure seeded shelter simulation. `world.js` and `controller.js` are renderer/controller sources; run **`node work/v6/compose-renderer.mjs` after editing either**, which assembles `blacksite.js` using the preserved v5 renderer scaffold. Then **`node work/v6/build.mjs`** assembles the app from preserved v4 sources plus v6, writes `outputs/site/` and preserves locally vendored Three.js 0.180.0. Do not deploy a v4/v5-only build: it would remove the permanent game split and current features.

`relief.js` is Tweakmax; `ui.js` is the two-cabinet host, and `quick-ui.js` owns the combined timer, game library, histories and patch display. `style.css` / `quick-style.css` extend the preserved styles. `node work/v6/package.mjs` refreshes the standalone demo, root aliases, website ZIP manifest and secret-checked file manifest. Static output is in `outputs/site/`. Readable sources are published under `src/blacksite/`.

Checks: `engine-tests.mjs`, `db-tests.mjs`, `quick-db-tests.mjs`, `browser-tests.mjs`, `quick-browser-tests.mjs`, `touch-and-retry-tests.mjs`, `verify-release.mjs`. Browser tests use the owned local preview on 4174, served by `work/v4/preview.mjs`. The existing headless Chromium in `work/v3/test-browsers/` works with SwiftShader for local WebGL QA. Test isolated demo data; do not create fake votes, scores or health reports in the live group.

## Gameplay and economy

BLACKSITE has a 120-metre district, eight enterable buildings, physical walls/doorways, lockers, ambient rats and a shelter reactor. Waves attack it; losing the reactor or dying ends the raid. Earned run scrap buys five weapons, seven feature attachments, up to four automatic turrets, Tesla/cryo turret effects, reactive barricades, repairs, magnets and fictional infusion vials. Upgrades reset each raid. There is no real money, paid loot or permanent cosmetic combat advantage.

Weapon features combine: quad shots, piercing rivets, ricochets, chain lightning, plasma pools, freeze/shatter, healing kills and orbital rats. Dash and parry share stamina; weapons overheat. **E interacts**, with contextual screen prompts. R parries, Q vents, V uses an infusion, F cycles weapons, Space dashes. Twin-stick touch controls and fullscreen/game mode must work in portrait and landscape. Pausing is limited to twenty seconds; the shop does not pause the horde.

Bosses are original KME models and names: Mortgage Mole burrows with a visible eruption warning; Unlicensed Archer is a beige mannequin bow user; Sludgemass is very tanky with low damage; Mr. Potency starts weak and returns nine seconds after death as a much harder vapour-cannon boss with armour and reload windows. Keep the generic ideas; don't copy other games' character models, textures, branding or sounds. Private/nonprofit does not establish a blanket copyright exemption.

Normal BLACKSITE runs have no fifteen-minute cutoff. Fresh server checkpoints are still required within 45 seconds. Shared finale sessions retain their five-minute limit and 300-second per-run credit. Daily global boss damage caps are unchanged: first two full extractions up to60 each, next twenty1 each, later cosmetics only. Cosmetic capsules cap at12/run. New `kme_blacksite_finish` atomically stores per-character highest wave, longest shift, best banked score, extractions and deaths. Death/retreat keeps20% of eligible score/capsules and loses the greed reward bonus; safe extraction keeps the eligible haul. Client scores have timing bounds, not proof of honest play.

Tweakmax automatically starts alongside a visible three-minute coping timer; five minutes is selectable. Difficulty rises every four seconds, with armoured two-hit targets and shrinking reaction windows. The timer continues when the game ends. It is a coping tool, never a prediction of when an urge will end. Game failure says nothing about whether nicotine was resisted. `kme_relief_finish` banks competitive points separately from bounded daily fragments, and only records resistance on an explicit **Bank & I resisted** request with device nicotine sharing and profile tracking enabled. Retry/upgrade of an already banked receipt is idempotent. Closing, game over and games-only banking never invent a health outcome. New game records are private with RLS, export support and deletion cascades.

## Two-day ballot workflow

Automation `kme-arcade-build-the-winning-game` returns every two days. Read only current ballots and aggregate votes; don't read unrelated health reports. Voting stays open for48h. No votes keeps the current side game and renews proposals; stay quiet. A voted deterministic winner becomes awaiting_build; the side game remains until the winner exists and has passed public deployment verification. Ties use first-listed choice order.

Build the winning **side game** under `window.KMEGames.registry[winner_key]`, preserving BLACKSITE, Urge Breaker, existing registries, data, scores, privacy and caps. The common host supplies start/checkpoint/finish/cancel hooks. Keep high scores separated by key. Side games use the current five-minute ticket policy unless a deliberate tested change is needed. Propose three fresh ideas after publication, excluding previous proposals and reserved permanent game keys. Give the release a new signature patch name; add its history entry. The library reads published ballot history automatically.

Publish the client first, verify the successful Pages deployment and public assets, and only then call owner-only `kme_private.publish_arcade(ballot_id,winner_key,game_name,verified_build,next_choices)`. Client roles cannot activate games. Never alter ballots, votes or winner rules to fit implementation convenience. Keep notification behavior quiet on unchanged/non-actionable state; notify on meaningful completion, failure or required user action.

## Deployment and privacy

Live URL: https://tuurevvv.github.io/KME-enterprise/ . Repository: `TuureVvv/KME-enterprise`. The actual Pages branch is **TuureVvv-MAJORPATCH_1**, not main; recheck the latest successful Pages run before publishing. Supabase project: `amuvikkddeeckhtimhht`. Use connected GitHub/Supabase tools. Publish only release-manifest files; never include the setup SQL containing the shared password, owner keys or runtime private data. The publishable browser key is intentional.

The current SQL upgrade is `outputs/killme-enterprise-shelter-shift.sql`; it depends on earlier v3/v4/v5 migrations. Its private helper backups preserve live definitions. It does not change the active side game or cast votes. Owner activation of the starting `smoke-break` side cabinet happens only after new public code is verified. All new records are private, admission-gated and cascade with character deletion. Keep the Netflix-style picker and explicit remember choice; never fall back silently to the first character. Any admitted friend can delete a character by typed-name confirmation, by user design.

Only free private-friends scope is authorized: no purchases, tradable rewards, gambling, cash prizes or real-world claims. Preserve optional nicotine sharing and games-only mode. Use server guards and explicit grants, not merely the authenticated role, for authorization. Don't claim a deployment or legal guarantee without evidence. Record verified release details in `outputs/`.

## v2.2 Common Room and Studio

Sources: `community-core.js`, `art-api.js`, `studio.js`, `community.js`, `community.css`, `home.html`, `v22.sql`. `drawing.js` is now only the quick-dialog bridge; `studio.js` owns the raster editor. Preserve unlimited drawing actions, lossless originals and IndexedDB legacy-draft migration. Do not reintroduce the 24 KiB/800-stroke/600-point limits or reduce detailed art to a fixed palette. Use small previews and prune older stored originals instead. The 24 MiB transfer envelope is above the worst-case lossless output of the fixed 2048 × 1536 canvas; it is not a stroke-complexity gate.

Drawing Studio is a permanent unscored cabinet under `drawing-studio`; it does not call competitive run APIs or invent boss damage. Keep BLACKSITE permanent and the existing rotating ballot/cabinet unchanged. The homepage shows recent chat and lazy small art previews with a composer; full-resolution originals load only on explicit request. Shared daily writing uses revision compare-and-swap, a client three-way merge and explicit overlap conflicts. Reset uses the server’s Europe/Helsinki calendar day. Preserve unsaved drafts instead of blindly overwriting.

Checks: `community-core-tests.mjs`, `v22-db-tests.mjs`, `v22-browser-tests.mjs`, `v22-recovery-tests.mjs`, plus relevant game regressions. Test only isolated demo data or a local database; never create fake live drawings, messages, scores, votes or health reports.

## v2.2.5 Overview layout

Nicotine support is the primary job. On phones the craving action and nicotine report buttons precede the streak, note and conversation. Desktop keeps them in the left support column alongside the note/social column. Crew updates combines chat/art and recent check-ins, with Everything / Chat & art / Check-ins filters and a composer above the feed. The old separate recent-news panel is gone; `feed-preview` is only a hidden compatibility sink. Preserve unified chronology and private, consented check-in semantics.

`home-chat-panel` is a native keyboard-accessible details disclosure, initially closed at widths <=760px and expanded on desktop. Refreshes must not change a user toggle; only breakpoint crossings reset the default. Do not download preview images while collapsed. Explicit View chat from a drawing opens this disclosure and selects Chat & art. Home artwork uses the full chat width; originals still load only on request. No SQL changes are needed. Layout checks: `v225-layout-tests.mjs` (supports --live).

## v2.2.6 Roster and milestone cards

Overview has a full vertical On shift roster, with every character rather than five avatar thumbnails. `renderCrewRoster` / `updateCrewRoster` in community.js display live second-resolution clocks, games-only labels and the latest available shared report per character. A small exclamation marks check-ins less than one hour old, expires automatically, and is suppressed for games-only characters. Use existing admitted state; do not fetch extra health records or create reports to populate it.

Rank/milestones is a standalone section card directly after nicotine check-ins and before the roster. Preserve this hierarchy at phone/tablet/desktop widths. Tests: v226-roster-tests.mjs (--live supported), alongside the v225 layout checks. No SQL change.
