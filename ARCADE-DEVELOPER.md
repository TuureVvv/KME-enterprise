# KME rotating arcade: developer handoff

The user asked for a newly built winning game every two days, rather than automatic rotation through a fixed library. A recurring follow-up named **KME arcade: build the winning game** is attached to the original conversation.

- Live site: https://tuurevvv.github.io/KME-enterprise/
- Repository: `TuureVvv/KME-enterprise`
- Actual Pages branch at this release: `TuureVvv-MAJORPATCH_1` (not `main`). Verify the latest successful Pages deployment before future changes.
- Supabase project: `amuvikkddeeckhtimhht`. Use the connected owner tools; never put owner keys or the shared app password in site files.
- Local source: `work/v4/`. Build with `node work/v4/build-app.mjs`; the preserved v3 base is `work/v4/v3-*.html/js/css`. Tests are `engine-tests.mjs`, `db-tests.mjs`, `browser-tests.mjs` and `edge-tests.mjs`. Site output is `outputs/site/`.

## Review a round

Read only the arcade's config, ballot choices, closing time and aggregate votes. `kme_private.sync_arcade_ballot()` closes an expired ballot; no-vote rounds preserve the current game and renew the same choices for another 48 hours. A round with votes becomes `awaiting_build`; its `winner_key` is fixed by count descending, then listed choice order. Do not manufacture votes, change the rules after seeing a result, or replace the current game merely because a timer expired.

If there were no votes, keep the game and stay quiet. A closed ballot with a winner remains pending while you develop it. Do not mark a game published unless its implementation and deployment actually exist.

## Implement and publish a winner

1. Implement a distinct, illustrated game with meaningful mechanics. Export the shared mount/destroy interface through `window.KMEGames.registry[winner_key]`. The host passes profile, mode, ticket start/pulse/finish/cancel functions. Preserve server tickets, the existing daily arcade damage cap and the cooperative finale's real-time checkpoint rules. New games must support short bankable sessions and mobile controls, with a keyboard alternative. Cosmetic loot never grants permanent gameplay power.
2. Keep high scores separated by game key. Test physics, mobile layout, save retries, lifecycle cancellation, per-game scores and backend permissions. The browser's score is bounded but not proof of honest play; retain the casual-game notice.
3. Commit and deploy the new client to the verified Pages branch. Keep the old game available in the registry. Verify the public HTML/assets and successful Pages deployment.
4. Only after the new client is available, activate it through the owner-only database function:

```
select kme_private.publish_arcade(
  <closed ballot uuid>,
  <winner key>,
  <implemented game name>,
  <verified release identifier>,
  <JSON array of exactly three fresh proposals>
);
```

Every next proposal needs a distinct stable lowercase key, name, pitch and mechanic; optional `art` chooses a concept style. Do not reuse the previous ballot's ideas. No client role has permission to publish. If owner/database or repository access is unavailable, prepare the concrete tested change and report that specific blocker once; keep the old game active.

## Urge Breaker and data controls

Urge Breaker never auto-logs a craving. A player can bank zero or any completed actions. Partial fragments carry across sessions within their UTC day. Every three accepted fragments can deal one boss damage; both character and anonymous device are capped at ten relief damage per UTC day. These limits are separate from the arcade's capped daily damage. Runs are device-bound; banks are idempotent. The receipt remains locally after a failed save, for retry by the same device identity. Coping timers and optional reports remain separate choices.

New tables are private with RLS and no direct client grants. Export includes votes, quick-game runs and scores; deleting a character cascades its rows, while anonymous device/security counters remain separate. Preserve the app's private, free friends-only scope: no purchases, bets, valuable prizes or tradeable items.

## Art

`assets/arcade-atlas.png` is an original image generated with the built-in image-generation tool. Prompt brief: a transparent 4×4 atlas of four running goblin poses; smoke ghost, pouch beetle, bat and corporate boss; capsule, coin, ward and shockwave; mushrooms, fern, kiosk and extraction portal. Consistent organic hand-painted 2D art, lime/forest/amber/lavender palette, no cubes, no labels. The source atlas is included at `assets/arcade-atlas.png`. Game backgrounds, particles and interfaces are code-native canvas/CSS.
