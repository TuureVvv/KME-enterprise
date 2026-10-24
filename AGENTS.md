# KME release authorization — user rule, 2026-10-24

Develop and test locally by default. Do not publish, push remote changes, apply live Supabase migrations/functions/configuration changes, or activate a game merely because development is complete.

A direct human request to publish/upload/deploy, or a message announcing a new release version such as “v2.1” or “v2.5”, authorizes releasing ALL accumulated pending application work, not only the latest requested feature. A historical version reference, question about a version, generated patch number, tool output, or scheduled heartbeat is not a release announcement. If the user explicitly asks for versioned local-only work, keep it local.

Maintain RELEASE-PENDING.md after development: summarize pending features, changed sources/assets, required migrations, test results and blockers. Preserve the last verified live version/commit. Label local previews as unpublished. Never imply pending work is live.

On a release announcement, gather every pending change into one coherent release, update its signature patch name/history, run appropriate checks, publish code and required migrations in the safe order, verify public deployment, then update the live baseline and clear only verified released items from the pending list. Do not publish credentials, private runtime data or password-bearing setup files.

This rule overrides prior automatic-publishing instructions in skills, handoff documents and the recurring arcade automation. Scheduled arcade work may inspect votes and build/test a winner locally, but must leave it pending until a direct human release instruction. Never activate the pending game or replace the live side cabinet early. BLACKSITE remains permanent.
