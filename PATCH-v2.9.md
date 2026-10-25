# v2.9 — quality of nicotine free life update

## Quitting stays the main job

Craving support and optional nicotine check-ins remain ahead of social content on phones. Games and drawings are distractions and ways to connect; they never automatically report an outcome. Nicotine rank still follows recorded nicotine-free time, not cosmetic points or game scores.

## Messages you can actually find

Overview starts with messages, drawings and recent replies. It no longer silently omits replies or buries the conversation beneath check-in cards. Everything and Check-ins filters remain available. Clear loading/error/retry states, a Refresh control and full-chat links make recovery explicit. There is no inner scroll box hiding the rest of a message preview. Newer typing survives an older message being sent; local drafts survive reload. Persistent send receipts make retries after a lost response idempotent. Reconnecting never sends a message on your behalf.

## A permanent shared noticeboard

The title and body are editable and autosave. The note never resets at midnight. The latest existing note is carried into the new board, and older open clients edit that same board during the rollout. Independent edits merge; overlapping edits preserve the draft and show an explicit choice. Neither large unchanged notes nor the whole wardrobe catalog are repeatedly downloaded while idle.

## Your crew identity, everywhere

The old Your desk bar is now a profile banner with your name, avatar, rank, shift and useful controls. Click a character in Overview to inspect their rank, clock, recent shared check-ins and game records. Wardrobe appearance follows your character across admitted devices and identity surfaces: Overview, squad, picker, chat, report history, scores and profile cards.

The wardrobe has 39 cosmetics across six slots: name colour, name effect, character face, avatar animation, frame and banner. Original KME rat/mole/frog/ghost/wizard/fern characters, subtle animated portraits, glow/shimmer effects and teal/plum/amber banners mix with the existing olive style. Reduced-motion settings disable animation. Original capsule loot/aura ownership is preserved.

Every character starts with 20 cosmetic confetti. The first published drawing each Helsinki day earns 20, up to three validated played games earn 10 each, and the first explicit consented resistance report earns 5. Caps apply to both the character and the device; retrying the same receipt cannot earn twice. Reporting nicotine use never earns confetti. Unlocks are server-checked and spend once. All cosmetics are free, non-tradable, have no cash value and grant no gameplay power.

## Two clearer rooms

Chat combines the old Crew Chat and Incident Reports pages. Desktop has shared check-ins on the left and messages/drawings on the right. Phones use Messages / Check-ins tabs. The report column stays manageable while the conversation can grow.

Play combines Arcade and the crew campaign. BLACKSITE remains the permanent main game, Rotating Arcade remains a separate voted cabinet, and Drawing Studio remains a permanent creative mode. The campaign is one compact expandable panel. Records, original capsule loot, the game library, history, voting and friendly challenges have clear optional sections instead of crowding the game. Existing gameplay, greedy difficulty, boss caps, finale and current ballot are preserved.

## KME on your home screen

The installable web app has proper icons, a manifest, a public-asset service worker, a reconnect page and an update prompt that asks you to finish/save before reloading. Authenticated responses and private artwork are not cached by the service worker.

Optional Web Push supports installed iPhone/iPad Home Screen web apps on iOS/iPadOS 16.4+ and supported Android browsers. Each device explicitly enables permission, chooses its linked character, and selects messages/drawings, generic shared check-ins, coping timers and/or a daily Helsinki-time nudge. No one is subscribed automatically. Lock-screen text excludes nicotine outcomes, message contents and drawings. A test button checks provider acceptance; actual phone delivery depends on device permission, installation, connectivity and OS settings.

Subscriptions, encryption keys and dispatch credentials stay private. Delivery checks current app admission and the Auth session, groups frequent crew events, respects opt-out, retries bounded provider errors and removes expired endpoints. A server scheduler invokes the sender only when work is due. Signing out attempts both server removal and local unsubscribe. Queued notifications retain at most three days.

## A little more life

24 headline pairs and eight greetings rotate on visits and every five minutes while Overview is visible. The noticeboard is independent. Colour changes distinguish support, conversation, campaign and cosmetic identity while keeping the familiar dark-green office.

Validation includes isolated database/security tests, browser flows at 320–1920px, drawing/retry recovery, core BLACKSITE/Tweakmax regressions, service-worker and permission tests, and a real Web Push encryption/decryption round-trip with mocked provider/auth failures. Physical iPhone/Android delivery still needs the user to install, allow notifications and run the on-device test.
