---
name: orbit
description: Seven of the user's own reel covers circle the speaker's head on a tilted 3D ring: the back of the ring goes behind them, the front in front, with depth blur and motion blur; it spins up on the beat. Use when the user asks for orbit or describes it (orbit, reels circling my head, carousel around me, cards spinning around head) on a talking-head video.
---

# Orbit

Seven of the user's own reel covers circle the speaker's head on a tilted 3D ring: the back of the ring goes behind them, the front in front, with depth blur and motion blur; it spins up on the beat.

Global `FxOrbit`, kit `pack/orbitdoc.js`. Made for 2.0-3.0 s of clip. Needs 7 covers in `<work dir>/media/reels/`.

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxOrbit", "kits": ["pack/orbitdoc.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `reels` | seven file names | the covers, 9:16 pictures in media/reels/ (use the user's real reels) |
| `at` | 0.5 | the spin-up (sound: orbit-whoosh) |
| `spin / rx / cardW` | 1.0 / 440 / 248 | extra turns on the burst, ring radius, card width in px |

To open it in the Claude-app frame (a typed `/orbit` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
