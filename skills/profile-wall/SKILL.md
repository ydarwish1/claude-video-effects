---
name: profile-wall
description: The user's Instagram-style profile page sits on the wall behind their head (their real name, handle, bio and reel grid), its tiles popping in; under the chin a channel chip whose Follow button is tapped into Following. Use when the user asks for profile wall or describes it (profile behind me, my Instagram page behind my head, depth UI, channel page behind head) on a talking-head video.
---

# Profile Wall

The user's Instagram-style profile page sits on the wall behind their head (their real name, handle, bio and reel grid), its tiles popping in; under the chin a channel chip whose Follow button is tapped into Following.

Global `FxProfileWall`, kit `pack/cutshot.js`. Made for 2.0-3.0 s of clip. Needs the avatar and up to 9 covers in `<work dir>/media/reels/`.

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxProfileWall", "kits": ["pack/cutshot.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `name / handle / posts / bio` | his own | the user's real profile: name, handle, post count, up to 3 bio lines |
| `avatar` | ['reel1-6', 270, 410, 300] | make it with tools/avatar.py, then ['avatar-540', 270, 480, 540] |
| `covers` | nine names (no .jpg) | the grid: 9:16 pictures in media/reels/, names without .jpg |
| `pop / tap` | [0.25, 0.8] / 1.3 | the grid pops (sound: tile-pop) and the Follow tap (sound: tap) |

To open it in the Claude-app frame (a typed `/profile-wall` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
