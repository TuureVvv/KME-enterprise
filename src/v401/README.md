# v4.0.1 — Archives guardian hotfix

Current hotfix layer over the preserved v4.0 implementation in `work/v10`. Read the root constitution/handoff first. The complete verified v4.0 release is preserved under `baseline/v4.0`; necessary app source is already imported into this project.

`engine-source.mjs` fixes guardian HP fallback; `build.mjs` assembles v10, replaces the engine and clarifies fresh-kit starting sectors. The original v10/v8 sources are retained. No backend change is required. `guardian-browser-tests.mjs --expect-freeze` records the original non-finite meter failure, while its normal mode checks real summons/attacks/defeat/transit and phone rendering. `test.mjs` runs the hotfix checks and affected v4 combat/modifier regressions against the new engine.

```powershell
node work/v11/build.mjs
node work/v11/test.mjs
node work/v11/release.mjs
```

Build/test/release preparation is local. Actual deployment identifiers and public verification belong in `outputs/DEPLOYMENT-v4.0.1.json`. The user reported a reproducible freeze in the shipped v4 update; this is its corrective patch, within the current v4 publication work.
