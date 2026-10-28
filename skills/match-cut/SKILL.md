---
name: match-cut
description: Full-screen pages of article text cut every few frames while one word stays locked in a red box at the same spot, then the pages fall away to the speaker with the word above their head. Use when the user asks for match cut or describes it (match cut, word locked across pages, newspaper cuts, one word highlighted across articles) on a talking-head video.
---

# Match Cut

Full-screen pages of article text cut every few frames while one word stays locked in a red box at the same spot, then the pages fall away to the speaker with the word above their head.

Global `FxMatchCut`, kit `pack/cutshot.js`. Made for 2.0-3.0 s of clip. Shows no face while the pages fill the screen.

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxMatchCut", "kits": ["pack/cutshot.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `text` | the speaker's own lines | the article text (use the user's own words or their script; never invent quotes) |
| `word` | 'Ultrathink' | the locked word; it must appear in the text |
| `every` | 3 | frames per page (sound: page-cut on every cut) |
| `out` | 1.35 | when the pages fall away to the speaker |

To open it in the Claude-app frame (a typed `/match-cut` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
