# BLACKSITE v5 continuation

This extension is assembled over v4.0.1. Build `node work/v12/build.mjs`; cumulative production v6 is built by `node work/v13/build.mjs`. The verified original v4.0.1 release is preserved at `baseline/v4.0.1`. The standalone local v5 build is snapshotted at `baseline/v5.0-local` by the v6 builder and is not a separate deployed release.

`expedition.js` extends the pure simulation. `interface.js` stays inside the existing mount lifecycle. `engine-source.mjs` and `build.mjs` assemble the extension with checked anchors. `style.css` scopes additions to game components. The one-time authoring helper `polish.mjs` is historical; do not rerun it as part of building.

See `DESIGN-IMPLEMENTATION-PLAN.md`, `PATCH.md`, and the current v6 validation/deployment evidence.
