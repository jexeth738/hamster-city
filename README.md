# Squeek City — Grand Theft Hamster

A retro top-down open-world heist game starring a hamster thief, powered LIVE by Squeektoshi's wheel on [Squeekchain](https://squeekchain.com).

**Play:** https://salsabila2507.github.io/hamster-city/

- Hamster running = day city, sleeping = night city (loot x0.5)
- Wheel RPM boosts speed & loot; 70+ RPM = ZOOMIES (x2)
- Every real new block drops golden seeds in the city
- 13 story missions, side jobs, 5-star wanted level, vehicles, interiors, shop & skins
- Grandpa Nibbles tutorial, How to Play guide (H) and contextual tips
- Keyboard + mobile touch controls. Built with Phaser 3.

## Mobile
Landscape is recommended. The canvas width follows the phone's aspect ratio, the HUD scales up on small screens, safe-area insets (notches) are respected, and portrait shows a "rotate your phone" screen (with a fullscreen + landscape button on Android, or "play in portrait anyway").

## Custom domain (later)
All asset paths are relative, so the build works from any domain or sub-path. To move it to a custom domain:
1. Add a file named `CNAME` at the repo root containing just the domain, e.g. `play.example.com` (not added yet on purpose).
2. At your DNS provider: for a subdomain add a `CNAME` record `play` -> `salsabila2507.github.io`; for an apex domain add `A` records 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153.
3. GitHub repo -> Settings -> Pages -> Custom domain: enter the domain, wait for the DNS check, then tick "Enforce HTTPS".
4. In `index.html`, update the absolute `og:url`, `og:image` and `twitter:image` URLs to the new domain (social previews need absolute URLs). The in-game "Share on X" link picks up the current domain automatically.
