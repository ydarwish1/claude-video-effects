---
name: app-frame
description: Wraps any effect of this plugin in the Claude-app frame from the viral "one clip, N edits" reels - a Claude phone app (Code tab, dark) types the slash command, taps the suggestion, sends it, shows "Editing with ..." and an orange dot matrix that dissolves into the effect, then zooms it to full screen. Use when the user wants the effect "as a slash command", "in the Claude app", "like the reels where Claude types the command", or is building a reel of several effects.
---

# App Frame

Global `FxAppShell`, kit `pack/shell.js`. It plays 1.33 s of app before the effect is full screen: the effect
starts at 0.667 s (inside the chat card), so the scene has `"lead": 0.6667` and the clip part is the effect's own
length. Typing has key taps, the suggestion a tap, the send a swoosh, the card a shimmer and the zoom a whoosh; the
wrapped effect keeps its own hits.

## Run it
Follow `../../engine/HOW.md`. The scene lists the shell's kit and the effect's kit:

```json
{"global": "FxAppShell", "kits": ["pack/shell.js", "pack/glass.js"], "start": 3.2, "dur": 2.3, "lead": 0.6667,
 "keepAudio": false,
 "config": {"command": "/glass-widgets", "desc": "frosted glass widgets around your head",
            "inner": {"global": "FxGlassWidgets", "config": {"name": "Ada Lovelace"}}}}
```

## Settings

| Setting | Default | What it does |
|---|---|---|
| `command` | `/glass-widgets` | the typed command (the first 3 characters are typed, then the suggestion is tapped) |
| `desc` | `frosted glass widgets around your head` | the suggestion's second line |
| `inner` | none | the effect: `{ "global": ..., "config": {...} }`, with its kit added to `kits` |
| `card` | `[64, 604, 520, 924]` | the chat card (x, y, width, height) |

Every time in the shell sits on a whole frame (n/30), so the wrapped effect's hits stay on their frames; keep it so
if you change them. The first frame shows the app already open: fine for a part inside a reel; as the first frame of
a reel, start with the `effects-grid` hook instead.
