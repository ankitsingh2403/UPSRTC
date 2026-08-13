# UP Parivahan — Saloon-style React Music Site

This version recreates the supplied visual composition for the UP Parivahan theme:
- Full-screen UP Parivahan bus interior image
- Large centered Hindi title
- Top clock / online indicator / service chips
- Route: Ballia → Sikandarpur → Belthara Road → Lucknow
- Authentic bus-style rotating notices instead of generic shayari
- Small cassette/tape-deck music player at the bottom
- Real YouTube IFrame player
- Real playlist Previous / Next support

## Add your playlist

Open `src/App.jsx` and put your playlist URL here:

```js
const YOUTUBE_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLl2jQn4j1xPhjPgjze0Ks19_z7gT7Eq1l";
```

The app extracts the `list` parameter automatically. The supplied URL is a YouTube Mix/Radio-style list (`RDuIYFObB-yv0`), so availability and ordering are controlled by YouTube and can change dynamically.

Example:

```text
https://www.youtube.com/playlist?list=PL123456789
```

Then:

```js
const YOUTUBE_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PL123456789";
```

With a valid playlist:
- Play/Pause controls the actual YouTube song
- Previous goes to the previous playlist video
- Next goes to the next playlist video
- When a song ends, YouTube continues through the playlist
- The UI syncs the current song title and playlist index

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

### About the supplied link

The project is configured with the fixed YouTube playlist supplied by the user: `PLl2jQn4j1xPhjPgjze0Ks19_z7gT7Eq1l`. Previous/Next use the actual YouTube playlist navigation.
