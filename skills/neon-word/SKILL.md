---
name: neon-word
description: The room drops into a dark warm grade and a neon word lights up on the wall behind the speaker's head (they stand in front of it), flickering on with a buzz, its glow spilling on the wall and rimming their hair. Use when the user asks for neon word or describes it (neon sign behind me, neon word, spotlight word behind head, glowing word on the wall) on a talking-head video.
---

# Neon Word

The room drops into a dark warm grade and a neon word lights up on the wall behind the speaker's head (they stand in front of it), flickering on with a buzz, its glow spilling on the wall and rimming their hair.

Global `FxNeonWord`, kit `pack/glass.js`. Made for 2.0-3.0 s of clip. Works best with a plain wall behind the speaker and some space above their head.

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxNeonWord", "kits": ["pack/glass.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `word` | 'ULTRATHINK' | the neon word (one word, 6-11 letters reads best) |
| `at` | 0.45 | the frame the tube lights (sound: neon-on) |
| `width / base` | 920 / 588 | the word's width and the y of its baseline in px |

To open it in the Claude-app frame (a typed `/neon-word` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
