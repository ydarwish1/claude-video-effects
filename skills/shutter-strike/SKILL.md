---
name: shutter-strike
description: Split screen: photo prints of the speaker, grabbed from the clip itself, are struck onto a light table one by one with a camera flash, stacking with real paper shadows; the speaker plays below. Use when the user asks for shutter strike or describes it (shutter strike, photo prints, camera flash snapshots, polaroids of me stacking) on a talking-head video.
---

# Shutter Strike

Split screen: photo prints of the speaker, grabbed from the clip itself, are struck onto a light table one by one with a camera flash, stacking with real paper shadows; the speaker plays below.

Global `FxShutterStrike`, kit `pack/cutshot.js`. Made for 2.0-3.0 s of clip. 

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxShutterStrike", "kits": ["pack/cutshot.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `strikes` | [0.35, 0.7, 1.05] | the shutter times (sound: shutter on each) |
| `split` | 0.45 | the share of the frame the light table takes |
| `pre` | true | a print already on the table at the start |

To open it in the Claude-app frame (a typed `/shutter-strike` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
