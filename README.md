# KILLME ENTERPRISE

Private, free friends-only tracker and arcade.

Play: https://tuurevvv.github.io/KME-enterprise/

BLACKSITE: The Last Shift is the current 3D extraction roguelite: 1–15 minute runs, twin-stick mobile controls, keyboard/mouse combat, timed parries, weapon heat, relay objectives, wardens and increasingly dangerous floors. Use the **Fullscreen / game mode** button beneath the game to expand it on phone or desktop.

The current 48-hour vote remains in progress. No votes means no game change. The owner builds and deploys voted winners before activation. See [ARCADE-DEVELOPER.md](ARCADE-DEVELOPER.md) for the development handoff and gameplay requirements.

GitHub Pages serves the static client. Supabase holds group data behind admission checks and RLS. Only a publishable browser key belongs in config.js. Shared passwords and owner keys must never be committed. Cosmetic rewards are free, non-tradeable and confer no permanent power. Casual client scores cannot prove honest play.

Three.js 0.180.0 is vendored locally under MIT; see vendor/THREE-LICENSE.txt. There are no external graphics or game-server dependencies. src/blacksite contains the readable sources integrated into app.js.
