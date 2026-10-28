---
name: glass-widgets
description: Frosted glass widgets float around the speaker's head (a big number tile, a profile tile with their avatar, a render bar, a ring, their latest reels) and tuck behind their hair; on the beat the bar and ring complete with a glassy tick. Use when the user asks for glass widgets or describes it (glass widgets, frosted glass UI around the head, iOS widgets, liquid glass dashboard) on a talking-head video.
---

# Glass Widgets

Frosted glass widgets float around the speaker's head (a big number tile, a profile tile with their avatar, a render bar, a ring, their latest reels) and tuck behind their hair; on the beat the bar and ring complete with a glassy tick.

Global `FxGlassWidgets`, kit `pack/glass.js`. Made for 2.0-3.0 s of clip. Needs the avatar and three covers in `<work dir>/media/reels/`.

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxGlassWidgets", "kits": ["pack/glass.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `at` | 0.6 | the moment the render bar and the ring complete (sound: glass-tick) |
| `big / bigLines` | '7' / ['edits', 'one clip'] | the big number tile |
| `name / handle / stat / statLabel` | 'Yusif Darwish' / '@yusifdarw' / '10' / 'posts' | the profile tile: use the user's own |
| `avatar / crop` | 'reel1-6.jpg' / [266, 300, 330] | the profile picture: make it with tools/avatar.py, then 'avatar-540.jpg' / [270, 480, 540] |
| `covers` | three files | the 'Latest reels' tile: three 9:16 pictures in media/reels/ |
| `render / ring / ringLabel / reelsLabel / pillHtml` | '1080p' / '30' / 'fps' / 'Latest reels' / 'Edited by <b>Claude</b>' | the other tile words |

To open it in the Claude-app frame (a typed `/glass-widgets` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
