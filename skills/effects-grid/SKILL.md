---
name: effects-grid
description: Builds the opening and the ending of a "one clip, N edits" reel - a grid where every finished edit plays at once - and joins a whole reel. Hook mode opens on the grid with a headline and zooms into one tile; end mode shows the Claude app's home ("Evening, <name>"), types the comment keyword, then the grid under Comment "KEYWORD" and an orange pill. Use when the user wants "show all the edits at once", "the end grid", "comment X for all the effects", or a full multi-effect reel.
---

# Effects Grid

Global `FxEndGrid`, kit `pack/endgrid.js`. Each tile plays frames of one finished edit.

## A full reel, step by step
Follow `../../engine/HOW.md` for setup and prep, then:
1. Render each edit, usually wrapped in the `app-frame` skill (one scene per edit, `keepAudio` the same for all).
2. Make the tiles of each edit: `PY -I ENGINE/tiles.py <work dir>/renders/<edit>.mp4 <work dir>/tiles/<edit> --skip 40`
   (`--skip 40` leaves out the app intro; `--skip 0` for an edit without the app frame). It prints the frame count `n`.
   Add one tile of the untouched clip if you like: render nothing, just
   `ffmpeg -ss <start> -i <work dir>/clip.mp4 -t 2.3 -vf scale=456:810 -q:v 3 -start_number 0 <work dir>/tiles/raw/%05d.jpg`.
3. The end card scene (`"frames": 132` is 4.4 s; `start`/`dur` can be any prepared part, the card does not show it):
   ```json
   {"global": "FxEndGrid", "kits": ["pack/endgrid.js"], "start": 0, "dur": 2.3, "frames": 132, "keepAudio": false,
    "config": {"name": "Yusif", "keyword": "EFFECTS", "pillText": "for all 7 edits",
               "tiles": [{"frames": "/work/tiles/glass/NNNNN.jpg", "n": 49, "label": "/glass-widgets"}]}}
   ```
4. The hook scene: the same tiles with `"mode": "hook"`, `"hookText": "1 clip. 7 edits."`, `"hookSub": "one prompt
   each"`, `"zoomTile"` (the tile it zooms into, from 0) and `"frames": 29`. The hook has no sound on purpose.
5. Join: `PY -I ENGINE/join.py <work dir>/renders/reel.mp4 <hook.mp4> <edit 1.mp4> ... <end.mp4>`, then run
   `check.py` on each part. The comment keyword on screen must match what the user really sends in the DMs:
   never promise something they do not have ready.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `tiles` | none | `[{ "frames": "/work/tiles/<name>/NNNNN.jpg", "n": frames, "label": "/command" }]`, up to 8 (4 x 2) |
| `keyword` / `pillText` / `name` | `EFFECTS` / `for all 7 edits` / `Yusif` | end card words |
| `mode` | `end` | `hook` for the opening |
| `hookText` / `hookSub` / `zoomTile` | `1 clip. 7 edits.` / `one prompt each` / 0 | hook words and the tile it zooms into |
