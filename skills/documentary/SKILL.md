---
name: documentary
description: The shot becomes a black-and-white documentary poster: the speaker in hard black and white over a magenta spotlight, a spaced kicker, a three-line condensed headline, a name bar, and a Follow button a cursor taps into Following. Use when the user asks for documentary or describes it (documentary look, black and white poster, doc intro, editorial cover with follow button) on a talking-head video.
---

# Documentary

The shot becomes a black-and-white documentary poster: the speaker in hard black and white over a magenta spotlight, a spaced kicker, a three-line condensed headline, a name bar, and a Follow button a cursor taps into Following.

Global `FxDocumentary`, kit `pack/orbitdoc.js`. Made for 2.0-3.0 s of clip. 

## Run it
Follow `../../engine/HOW.md` (relative to this file): set up once, prepare the video, write the scene, check stills,
render, check. The scene for this effect:

```json
{"global": "FxDocumentary", "kits": ["pack/orbitdoc.js"], "start": 0, "dur": 2.3, "keepAudio": true, "config": {}}
```

## Settings (all optional; defaults in brackets are the creator's own)

| Setting | Default | What it does |
|---|---|---|
| `kicker` | 'CLAUDE CODE · ONE CLIP · SEVEN EDITS' | small spaced line at the top (HTML: <b>, <i> allowed) |
| `lines` | ['ONE <i>CLIP.</i>', 'SEVEN EDITS.', 'ONE PROMPT.'] | the three headline lines; <i> marks the accent word |
| `name / handle` | 'YUSIF DARWISH' / '@yusifdarw' | the name bar: use the user's own |
| `tap` | 0.9 | the Follow tap (sound: tap) |
| `ghost` | '07' | the huge outlined number behind |

To open it in the Claude-app frame (a typed `/documentary` command, a dot loader, a zoom to full screen), wrap it with
the `app-frame` skill.
