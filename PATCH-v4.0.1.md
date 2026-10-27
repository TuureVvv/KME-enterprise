# v4.0.1 — Archives guardian hotfix

Calling the Archives guardian after delivering all three evidence pages could stop the game permanently. Promoting Head of Approvals to district guardian exposed a missing entry in the old guardian-health override table. The resulting invalid HP reached the HTML health meter, which threw before the next frame was scheduled.

The guardian summon now retains the valid, difficulty-scaled health already assigned by the enemy catalogue whenever there is no special guardian override. Existing special boss health values remain intact. All supported bosses are checked as promoted guardians; browser regression follows the real Archives evidence → delivery → requisition → guardian-call path, verifies continued movement/rendering/damage, then defeats it and carries the build into the next sector. Other maps and Mr. Potency's two-stage fight are checked too.

The start screen now makes the existing rules clear:

- **Mossline Yard / recommended:** the full expedition, building your kit through every district.
- **Unlocked later sectors / advanced shortcuts:** start there with the normal fresh operative kit. Earlier sectors, their loot and their score are skipped. This is not a suspended-run or saved-build resume.
- Every start continues through subsequent districts and into harder circuits. The rules and rewards for these starts are unchanged.

No database migration or collectible reset is part of this hotfix. Refresh to load v4.0.1. Combat worlds were not persisted, so the previously frozen combat state cannot be resumed by the new client.
