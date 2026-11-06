# Wheel-controlled heists implementation

Goal: make Squeektoshi's hardware feed control playable heists, not just a dashboard.

Approved brief: LIVE never simulates; PRACTICE is isolated. A new observed block opens one golden heist, running opens wheel contracts, sleep closes them, and 70+ RPM doubles loot and intensifies pursuit. Attribution stays unchanged. Approval is a human review, never guaranteed by this implementation.

- [ ] Test feed validation, continuity, deduplication, stale payout gates, mode/save/cloud isolation before implementation.
- [ ] Implement validated hardware-feed state in js/state.js, using decimal block IDs and explicit optimistic/settled labels. First sample and reconnect establish baselines, never backfill missed blocks.
- [ ] Implement wheel contracts and golden cargo/extraction in js/mission.js and js/city.js; block-gate wheel completion, block-tag golden caches, stop stale rewards in all world/interior paths.
- [ ] Replace the start menu with explicit LIVE / PRACTICE choices. Show chain effects and current event in the HUD and DOM. Make portrait genuinely usable with an optional landscape suggestion.
- [ ] Guard cloud writes/adoption by LIVE rules version, update README/help, preserve verification.
- [ ] Run node tests, browser desktop/mobile/disconnect/reconnect flows, syntax and diff checks; commit and push the authorized rebuild. Check the deployed strings and report review limitations honestly.

Verification: node --test tests/*.test.cjs; browser tests against local static server, then read-only live-site check. No transactions, wallet signatures, DNS changes, form submissions or Squeekchain application submissions.
