<p align="center"><a href="https://squeekcity.space"><img src="docs/banner.png" alt="Squeek City — Wheel Heists" width="100%"></a></p>

<p align="center">
  <a href="https://squeekcity.space"><img src="https://img.shields.io/badge/play-squeekcity.space-ffd166?style=for-the-badge" alt="Play live"></a>
  <img src="https://img.shields.io/badge/Phaser-3-8a4baf?style=for-the-badge" alt="Phaser 3">
  <a href="https://api.squeekchain.com/v1/status"><img src="https://img.shields.io/badge/Squeekchain-live%20API-7dff9a?style=for-the-badge" alt="Squeekchain live API"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT"></a>
</p>

<h3 align="center"><a href="https://squeekcity.space">Play now at squeekcity.space</a></h3>

A playable top-down heist game where **Squeektoshi decides when the job opens, how dangerous the chase is, and when your payout unlocks**. Free to play, no wallet, token purchase, transaction or signature. All seeds and rewards are game points, not SQK.

## Play the wheel, not a dashboard

Choose **PLAY LIVE · REAL WHEEL** or **PRACTICE · SIMULATED** on the title screen. The title, HUD and bottom status strip show run/sleep, RPM, projected and settled block heights, and the current heist.

### Wheel Heist — the main loop

1. Go to the **W** beside your starting position. The job opens **only while fresh hardware telemetry says the wheel is running**.
2. The observed Squeek block number selects one of four relay routes. Steal both caches while cats and vacuums pursue you.
3. Lose all wanted stars and return to the hideout.
4. Your cargo does **not** pay on a local timer: another newly observed wheel block after extraction unlocks the reward. If Squeektoshi sleeps first, the contract closes without a payout, including while a menu is open.

### Golden Heist — one chance per new observed block

During uninterrupted fresh polling, a higher projected block opens **one** block-tagged gold cache, at a block-seeded location. It expires after 90 seconds. Stealing it gives three wanted stars, **not** an immediate score: lose the heat and extract at W. Getting squashed loses the cargo. The last ten extraction receipts retain the block ID and observed/banked times in the local save.

A jump of multiple blocks opens only the newest cache. The first sample, reconnect, hidden-tab return and a changed installation/counter epoch establish a new baseline; **missed historical blocks never become a catch-up harvest**. High-water marks deduplicate repeated or rolled-back block snapshots. LIVE story missions cannot manufacture golden block caches.

## Exact Squeekchain hooks

Every 5 seconds `js/state.js` reads [`GET /v1/status`](https://api.squeekchain.com/v1/status), following the [official API docs](https://docs.squeekchain.com/developers/api/).

| Hardware / chain input | Gameplay consequence |
|---|---|
| `measurement.coreStatus`, `rpmMilli`, `speedMmPerSecond` | Running opens Wheel Heists, daylight and additional patrols. Sleep closes wheel contracts, sets night and reduces sight and ambient patrol count. |
| `rpmMilli >= 70000` while running | ZOOMIES: exactly x2 loot, x1.35 chase speed, increased detection and additional cats. |
| Fresh sleeping hardware | x0.5 ordinary loot; stealth and golden-cargo extraction still work. |
| `builder.projected.blockHeight` advances during continuous observation | One new golden heist; also unlocks a wheel contract already waiting at extraction. IDs use decimal strings / BigInt, not lossy floating-point arithmetic. |
| `builder.projected.blockProgress` | Next-block progress indicator. |
| `builder.anchor.blockHeight` | Separate settled height in the HUD; never mislabelled as projected height. |
| HTTP failure, stale/unknown data, counter fault, unsupported schema, unavailable builder/oracle | Immediately hold new payouts, loot collection, mission progress and event creation. No silent simulation, even for raw story rewards. A 15-second poll-silence watchdog also locks payouts. |

LIVE accepts schema v1, online **hardware** provenance, valid unsigned decimal block IDs, healthy builder/oracle, and received/observed timestamps within the sensor's stale limit (at most 120 seconds). Simulated/replayed provenance is rejected. No API keys are needed.

**Honest chain boundary:** the API's projected blocks are accepted-wheel-work projections, **optimistic and not yet Ethereum settlements**. The UI labels projected versus settled heights. Game pay is local game accounting, not an on-chain settlement, SQK mint, or verifiable financial reward. We do not copy another project's contracts or claim transactions that never occurred. The fictional Genesis Seed in the optional story is a prop, not a real chain asset.

### LIVE versus PRACTICE integrity

- Separate saves: `squeekcity.save.live.v2` and `squeekcity.save.practice.v2`.
- PRACTICE explicitly simulates run/sleep/blocks and never writes LIVE cloud saves or leaderboard scores. Its board is read-only.
- The old mixed live/simulation v1 save is left untouched, **not imported into LIVE**. Only saves stamped `rulesVersion: 2, mode: "live"` may be adopted from the cloud.
- `?sim=idle` / `?sim=zoomies` only affect explicit PRACTICE. They cannot force LIVE telemetry or scores.
- Cloud writes require a fresh LIVE signal and snapshot the LIVE save before asynchronous requests. Local saves remain usable if cloud service is unavailable.
- The online leaderboard is a casual browser-game board, **not a server-authoritative or tamper-proof competition**. Historical rows from the earlier version have not been erased.

## Code lane submission

This implements a hamster-controlled game rather than a read-only tracker or a cosmetic API overlay, targeting the official [Build this / Skip this guidance](https://squeekchain.com/genesis/code). Direct submission's DNS proof, page meta tag and repository attribution are kept intact. Technical proof and gameplay quality do **not** guarantee approval: the Squeekchain team retains final review. No application has been submitted automatically by this update.

## Story/free-roam screenshots (before the Wheel Heists update)

| | |
|---|---|
| ![Day city near the hideout](docs/city-day.png) | ![Wanted chase with alley cats and vacuums](docs/wanted-chase.png) |
| ![New block mined during zoomies](docs/new-block-zoomies.png) | ![Robbing a house interior](docs/interior.png) |

<p align="center"><img src="docs/mobile.png" alt="Mobile touch controls" width="80%"></p>

## Features

| | |
|---|---|
| Story | 13 missions from the park hideout, ending with the Genesis Heist at the Squeekchain Lab |
| Side jobs | Seed Courier and Vacuum Bash |
| Wanted level | 1-5 stars: alley cats, robot vacuums, angry owners with brooms, the pest control van, the Cat Patrol car. Hide in hedges to cool down faster |
| Vehicles | RC racer, toy cars stolen off the road, skateboard, hamster ball |
| Interiors | Walk into houses and shops and steal from them while the owners are around |
| Shop | Speed, bigger sack, dash, armor and five hamster skins |
| Help | Grandpa Nibbles walks you through a tutorial, and pressing H opens his guide |
| Leaderboard | Online top 20 for golden seeds, missions and longest wanted escape |
| Saves | Stored in local storage and synced to the cloud; the newer save wins on load |

## Leaderboard

In LIVE, open the board and choose SET NAME for a thief name (3-16 letters, numbers or `_`). When joining, the browser signs in anonymously to [Supabase](https://supabase.com), so there is no account or password.

| Board | Ranked by |
|---|---|
| Golden Seeds | Golden block-seeds collected |
| Missions | Story missions completed (of 13) |
| Longest Escape | Longest wanted chase that ended with the heat lost, not with getting squashed |

Press L (or TOP on mobile) for the top 20 and your own rank. The save syncs at save points and every 30 seconds. If Supabase can't be reached, LIVE keeps its local save and retries cloud sync only with a fresh hardware signal. PRACTICE never uploads.

The schema is in [`supabase/migrations`](supabase/migrations). Row Level Security lets anyone read names and scores, but only the owner can write their row or read their save. Scores have range checks and a server-side cap on how fast they can grow. The client only ships the publishable key.

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | WASD / arrow keys | Left joystick |
| Interact, ride, steal, talk | E / Enter | A |
| Dash (once bought), drift while driving | Shift / Space | B |
| Big map | M | Tap the minimap (tap again to close) |
| Help | H | ? |
| Leaderboard | L | TOP |
| Pause | P / Esc | II |
| Skip tutorial | T | Tap the tutorial box |

Portrait has its own tall logical viewport and remains fully playable; the landscape suggestion is a small dismissible strip, not a blocking screen. Touch joystick, A/B actions and menus remain available. Changing orientation saves and reloads the viewport.

## Run locally

It's a static site with no build step. Phaser and supabase-js are vendored in `lib/`.

```sh
git clone https://github.com/jexeth738/hamster-city.git
cd hamster-city
python3 -m http.server 8000
# open http://localhost:8000
```

## Hosting

Tests (no package installation needed):

```sh
node --test tests/*.test.cjs
```

Hosted on GitHub Pages from `main` with the custom domain in `CNAME`.

## Credits

Built by 0xyas & Jex. Fonts: Press Start 2P and VT323 (SIL OFL).

## License

[MIT](LICENSE)

squeekchain-project: f2a29d3e-8c90-4b00-8c40-019a7dfeb4a8
