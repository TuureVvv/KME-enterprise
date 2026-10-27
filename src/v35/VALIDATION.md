# v3.5 verification

The full release verification is recorded by `work/v9/test.mjs` in `outputs/V35-LOCAL-VERIFICATION.json` after every suite passes. Detailed outputs remain in `outputs/V35-RUNTIME-LOG.json`; a failure never produces a passing verification record.

**All 103 groups passed on 27 October 2026:** four calendar/scoring/collection rules, eleven isolated database groups, fourteen team/aura/audio browser groups and the seventy-four retained game/studio/social regressions. The armory suite exercised 750 compositions. Tests blocked the real backend and used local fixtures only. Exact final app/style/entry fingerprints are in the local verification record.

New database checks cover additive reruns, legacy world preservation, admitted API gates, private RLS/grants, late joins/weekly locks, receipt idempotence, confirmed contribution triggers, exclusion of nicotine-use rewards, popular-post anti-farming, character/device daily limits, affiliation hiding, last-copy protection, deterministic craft pricing, equip/removal, export and deletion. SQL advisory/row locks serialize mutations; the embedded database does not simulate separate production connections.

New browser checks cover optional/silent arrival, crew confirmation/Rally without health consent, updated totals, ten-tier collection, preview, equip/profile signatures, distill/craft/remove, a lost-response receipt across refresh, preserved old wardrobe categories, all three soundtracks and shared controls, mocked exact live adapter contracts, 320/360/390 portrait and 844 landscape, reduced motion and zero browser errors/backend requests. Existing suites cover 320–1920px, messages, noticeboard conflict/recovery, drawing pixels/layers/PNG download, combat/loot/shop/controls/settlement and renderer disposal.

Visual screenshots are saved under `outputs/previews/v35-*`. The release poster was generated with the built-in image tool and inspected for the actual shipped features and legible copy.

Publication has a separate evidence record: `outputs/DEPLOYMENT-v3.5.json`, public file fingerprints in `outputs/V35-PUBLIC-VERIFICATION.json` and a public isolated-demo smoke result in `outputs/V35-PUBLIC-DEMO.json`. No admitted live test plays, posts, health reports, votes or purchases are created. Physical phones, speaker quality and actual mobile browser audio policies have not been manually tested; browser viewport/touch checks are not a physical-device claim.
