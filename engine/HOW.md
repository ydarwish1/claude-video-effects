# How every effect skill runs

All paths are inside this plugin. ENGINE is the `engine` folder next to `skills` (two levels up from a skill's
SKILL.md: `<skill folder>/../../engine`). Use its absolute path in every command. PY is `ENGINE/.venv/bin/python`.

## 1. Set up (once per machine)
Run `bash ENGINE/setup.sh`. It prints `READY` (first run 2-5 minutes: Python libraries, Playwright Chromium, the
cut-out and face models, the sound hits). If it prints `NEED_...`, install that one thing for the user (Mac:
`brew install ffmpeg` / `brew install node` / `brew install python@3.12`; Linux: `apt install ffmpeg libegl1 libgl1`)
and run it again. `SOUNDS_INCOMPLETE` is not fatal: a missing hit is left out of the render and named in the output.

## 2. Prepare the video (once per video or per part)
`PY -I ENGINE/prep.py <video> <work dir> [--start S --end E]`
- The work dir is a new folder next to the user's video, for example `<video name>-fx/`.
- Prepare only the seconds you will use (`--start/--end`): the cut-out takes about 5-10 s of work per second of
  video. It crops to 9:16 around the face. It prints `PREPARED`.
- Pictures an effect shows (reel covers, an avatar) go in `<work dir>/media/reels/`. Covers: 9:16 images (540x960 is
  ideal). Avatar: `PY -I ENGINE/tools/avatar.py <profile picture> <work dir>/media/reels/avatar-540.jpg`, then set
  the effect's avatar to `avatar-540` (Profile Wall: `["avatar-540", 270, 480, 540]`; Glass Widgets:
  `"avatar": "avatar-540.jpg", "crop": [270, 480, 540]`).
- Use only the user's real things: their name, handle, numbers they give you, their own pictures. Never invent
  followers, views or money.

## 3. Write the scene
A JSON file in the work dir, for example `<work dir>/glass.json`:
```json
{"global": "FxGlassWidgets", "kits": ["pack/glass.js"], "start": 3.2, "dur": 2.3, "keepAudio": true,
 "config": {"at": 0.6, "name": "Ada Lovelace", "handle": "@ada"}}
```
- `start` / `dur`: seconds of the prepared clip (`clip.mp4` starts at 0). Effects are made for 2.0-3.0 s.
- `config` times are seconds from the scene start. If the user wants the effect's moment (`at`, `tap`, ...) on a
  word they say, ask for the second it is said in the video (or read it from a transcript they have); otherwise keep
  the default.
- `keepAudio: false` makes the hits the only sound (for a silent reel the user scores later).

## 4. Check stills, then render
- Stills (fast): `node ENGINE/render.mjs <work dir> <scene.json> --stills 0.2,0.8,1.6` writes PNGs to
  `<work dir>/stills/`. Look at every one: no text over the face, nothing cut off, text readable, the effect visible.
  The output must say `"errors":[]`.
- Render: `node ENGINE/render.mjs <work dir> <scene.json> --name <name>` writes `<work dir>/renders/<name>.mp4`
  (about 0.3-0.6 s per frame on a laptop).
- Check: `PY -I ENGINE/check.py <work dir> <name>` prints the numbers and PASS or MISS: frame count, decode errors,
  every sound hit within 1 frame of its picture, text inside Instagram's safe area (x 65-1015, y 269-1248), no text
  over the face. Fix and render again on a MISS; tell the user the numbers either way.

## 5. More than one effect
- In the Claude-app frame: see the `app-frame` skill (wraps any effect in a typed slash command).
- Several effects in one reel with a grid at the start and the end: see the `effects-grid` skill, then join the
  parts with `PY -I ENGINE/join.py <out.mp4> <part.mp4> ...` (writes a phone copy under 30 MB too).

Tell the user where the MP4 is, and that they should watch it before posting.
