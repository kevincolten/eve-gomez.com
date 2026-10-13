# eve-gomez.com

Singer and dancer site for Eve Gomez. One page, one content file. Built on the same engine as lauracolten.com.

## How it's put together

- `content.json` holds all the copy: the vocal reel, every cover (`covers.items`), originals (`music.tracks`), dance videos (`dance.items`), the bio and contact details. Edit this file to change what the site says.
- `js/page.js` lays out the page. `js/components.js` has the shared pieces: the reel player with adaptive streaming, posters, icons and socials. `js/main.js` loads the content and renders the page.
- `css/base.css` is the reset and the shared components. `css/page.css` is the look: a dark stage with neon pink, lilac and cyan, Bebas Neue type and glossy cover cards. `css/music.css` styles the originals player.
- `assets.json` lists every image (cover thumbnails and frames from her videos, hosted at media.austindevs.com/eve-gomez/site/). `scripts/fetch-assets.mjs` downloads them at build time.

## Videos and songs

- `reel.video` (the vocal reel) and each cover's `video` take an HLS playlist (`.m3u8`), a YouTube link or an `.mp4`. The covers currently point at the Dreaming Music Studio YouTube uploads.
- Originals go in `music.tracks` as `{ "title", "duration", "src" }` with an mp3 or m4a URL. The section shows "coming soon" until there's one.
- Dance videos go in `dance.items`, in the same shape as the covers.

The reels are HLS streams in the `portfolio-media` R2 bucket, served from https://media.austindevs.com/eve-gomez/<reel>/. Each reel folder holds `master.m3u8`, four renditions, `720p.mp4` and a poster. To make a new one:
1. Run `bash scripts/encode-reel.sh input.mp4 out/<reel>`.
2. Upload the folder.
3. Point `video` at the folder's `master.m3u8`.

## Still placeholder

- The bio and contact email (hello@eve-gomez.com needs to exist).
- Photos: the hero and about photos are frames from her covers.

## Run it locally

    npm run dev        # http://localhost:8767

## Deploy on Cloudflare Pages

Framework preset None. Build command `npm run build`. Output directory `/`.
