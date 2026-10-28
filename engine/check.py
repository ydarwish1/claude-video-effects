"""Measure one fx render: frames, sync of every sound hit to its picture event, the Instagram safe area, face cover,
matte flicker and time-to-read. Numbers come from the rendered MP4 and the render log, not from the plan.

  python -I check.py <work dir> <render name>

Safe area: Meta's Reels guidance, keep text out of the top 14 % (269 px), the bottom 35 % (672 px) and 6 % (65 px) at
each side of a 1080x1920 frame: text boxes must sit inside x 65-1015, y 269-1248.
Sync: the picture is read on the effect layer only, L = render minus the untouched clip frame (so the speaker's own
hand moves do not count), inside the box the element names for the event when it names one. Picture event = the
frame near the cue (up to 3 frames, and never past halfway to the next cue) where the layer change |L(f) - L(f-1)|
jumps the most from the frame before: the onset of the event. For Light Trail,
whose event is a peak, not an onset: the frame with the most effect light (sum of L) within 8 frames. Sound event =
where the hit's own waveform sits in the rendered mix (cross-correlation inside +-120 ms of where it was placed) plus
the hit's event point. Offset = sound minus picture; pass = within one frame (33.3 ms).
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import correlate

ENGINE = os.path.dirname(os.path.abspath(__file__))
WORK, fid = os.path.abspath(sys.argv[1]), sys.argv[2]
base = f"{WORK}/renders/{fid}"
log = json.load(open(base + ".log.json"))
mp4 = base + ".mp4"
SAFE = (65, 269, 1015, 1248)
FPS = 30

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                                "stream=codec_type,width,height,r_frame_rate,nb_read_frames:format=duration", "-of", "json", mp4],
                               capture_output=True, text=True).stdout)
vs = [s for s in pr["streams"] if s["codec_type"] == "video"][0]
dec = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", mp4, "-f", "null", "-"], capture_output=True, text=True).stderr.strip()
lead = log.get("leadFrames", 0)          # app-frame frames before the clip starts (FxAppShell)
n_expect = len(log["frames"])            # what the renderer drew (segment + lead, or a fixed-length card)
plates = [f["plate"] for f in log["frames"]][lead:]
gaps = sum(1 for a, b in zip(plates, plates[1:]) if b - a != 1)

# picture: small grey frames, and an orange mask count per frame
w, h = 270, 480
raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", mp4, "-vf", f"scale={w}:{h}", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
                     capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.int16)
src = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f"{WORK}/clip.mp4", "-vf",
                      f"select=between(n\\,{log['first']}\\,{log['first'] + log['segFrames'] - 1}),scale={w}:{h}", "-fps_mode", "passthrough",
                      "-frames:v", str(len(fr)), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], capture_output=True).stdout
so = np.frombuffer(src, np.uint8).reshape(-1, h, w, 3).astype(np.int16)
if lead:
    so = np.concatenate([np.repeat(so[:1], lead, axis=0), so])
n_cmp = min(len(fr), len(so))
layer = (fr[:n_cmp] - so[:n_cmp]).astype(np.float32)          # the effect layer: render minus untouched clip
energy = np.abs(layer).mean(axis=(1, 2, 3))
change = np.r_[0, np.abs(np.diff(layer, axis=0)).mean(axis=(1, 2, 3))]

# sound
wav = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", mp4, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "-"],
                     capture_output=True).stdout
mix = np.frombuffer(wav, np.int16).astype(np.float32) / 32768
sfx_meta = json.load(open(f"{ENGINE}/sfx/sfx.json"))
cues = []
for c in log["cues"]:
    sr, s = wavfile.read(f"{ENGINE}/sfx/{c['sfx']}.wav")
    s = s.astype(np.float32).mean(axis=1) / 32768 if s.ndim > 1 else s.astype(np.float32) / 32768
    s = s[: int(0.25 * sr)]
    planned = c["startMs"] / 1000
    # search +-120 ms, but never as far as halfway to a neighbouring hit: a repeated sound (page flicks every 0.1 s,
    # key taps 67 ms apart) would otherwise match its neighbour
    near = [abs(o["at"] - c["at"]) for o in log["cues"] if o is not c and abs(o["at"] - c["at"]) > 1e-6]
    reach = max(0.02, min([0.12] + [d / 2 - 0.004 for d in near]))
    lo = int(max(0, (planned - reach) * 48000))
    seg = mix[lo: lo + len(s) + int(2 * reach * 48000)]
    cc = correlate(seg, s, mode="valid")
    lag = (lo + int(np.argmax(cc))) / 48000
    sound_ev = lag + c["event"]
    cf = int(round(c["at"] * FPS))
    strength = 1.0
    if fid == "light-trail":
        win = range(max(0, cf - 8), min(len(energy), cf + 9))
        pic = max(win, key=lambda k: energy[k])
    elif fid == "head-drop":
        # impact: the whole frame dips when the word lands, so read the change in the bottom third, where no text is
        low = np.r_[0, np.abs(np.diff(layer[:, 2 * h // 3:], axis=0)).mean(axis=(1, 2, 3))]
        top = max(low[max(1, cf - 4):min(len(low), cf + 5)])
        pic = next((k for k in range(max(1, cf - 4), min(len(low), cf + 5)) if low[k] >= 0.5 * top), cf)
    else:
        ch = change
        if c.get("box"):   # the element named where its event happens: read the change in that box only
            bx, by, bw, bh = (int(round(v / 4)) for v in c["box"])
            sub = layer[:, max(0, by):max(0, by) + max(1, bh), max(0, bx):max(0, bx) + max(1, bw)]
            ch = np.r_[0, np.abs(np.diff(sub, axis=0)).mean(axis=(1, 2, 3))]
        # the event is where the change JUMPS (an onset), searched only up to halfway to the next cue in this part, so
        # rapid events (pages every 3 frames, key taps) are not read as each other; a lead-in motion (a bar filling, a
        # cursor arriving) changes steadily and does not jump
        others = [int(round(o["at"] * FPS)) for o in log["cues"] if int(round(o["at"] * FPS)) != cf]
        gap = min([abs(o - cf) for o in others] + [7])
        w = max(1, min(3, (gap - 1) // 2))
        win = range(max(2, cf - w), min(len(ch), cf + w + 1))
        pic = max(win, key=lambda k: ch[k] - ch[k - 1])
        # guard against a weak pick: the chosen jump against the biggest jump within 6 frames (1.0 = it is the biggest)
        wide = [ch[k] - ch[k - 1] for k in range(max(2, cf - 6), min(len(ch), cf + 7))]
        strength = round(float((ch[pic] - ch[pic - 1]) / (max(wide) + 1e-9)), 2) if wide else 1.0
    off_ms = (sound_ev - pic / FPS) * 1000
    cues.append({"sfx": c["sfx"], "cue_s": c["at"], "picture_frame": pic, "sound_s": round(sound_ev, 4),
                 "offset_ms": round(off_ms, 1), "strength": strength, "pass": abs(off_ms) <= 1000 / FPS + 0.5})

# text: safe area, cut off, face cover, time to read
face = json.load(open(f"{WORK}/face.json"))
cols = face["cols"]
# A box moving faster than 600 px/s (a card flying off, a word falling in) cannot be read in that frame: it is
# counted apart as "in motion"; the pass needs zero frames outside the safe area while text is at rest.
viol, viol_moving, cut, cover, firsts, fulls, prev_c = 0, 0, 0, 0, {}, {}, {}
worst = [9999, 9999, -9999, -9999]
centres = {}   # text -> {frame: centre}, so a box's first frame takes its speed from the next frame
offenders = []
for fr_log in log["frames"]:
    for bx in fr_log["boxes"]:
        centres.setdefault(bx["text"], {})[fr_log["f"]] = (bx["x"] + bx["w"] / 2, bx["y"] + bx["h"] / 2)
for fr_log in log["frames"]:
    row = face["rows"][fr_log["plate"]]
    fx0, fy0, fx1, fy1 = (row[cols.index(k)] for k in ("x0", "y0", "x1", "y1"))
    fx0, fx1, fy0, fy1 = fx0 * 1080, fx1 * 1080, fy0 * 1920, fy1 * 1920
    for bx in fr_log["boxes"]:
        x0, y0, x1, y1 = bx["x"], bx["y"], bx["x"] + bx["w"], bx["y"] + bx["h"]
        c = ((x0 + x1) / 2, (y0 + y1) / 2)
        p = prev_c.get(bx["text"]) or centres[bx["text"]].get(fr_log["f"] + 1)
        speed = ((c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2) ** 0.5 * FPS if p else 0
        prev_c[bx["text"]] = c
        if bx["op"] >= 0.5:
            outside = x0 < SAFE[0] or y0 < SAFE[1] or x1 > SAFE[2] or y1 > SAFE[3]
            if speed > 600:
                viol_moving += outside
                continue
            worst = [min(worst[0], x0), min(worst[1], y0), max(worst[2], x1), max(worst[3], y1)]
            viol += outside
            if outside and len(offenders) < 6:
                offenders.append({"frame": fr_log["f"], "text": bx["text"], "box": [x0, y0, x1, y1]})
            if x0 < 0 or y0 < 0 or x1 > 1080 or y1 > 1920:
                cut += 1
            ix = max(0, min(x1, fx1) - max(x0, fx0)) * max(0, min(y1, fy1) - max(y0, fy0))
            if ix > 0.05 * (fx1 - fx0) * (fy1 - fy0) and not fr_log.get("faceHidden"):
                cover += 1
        k = bx["text"]
        firsts.setdefault(k, fr_log["f"])
        if bx["op"] >= 0.95 and k not in fulls:
            fulls[k] = fr_log["f"]
reads = {k: round((fulls[k] - firsts[k]) / FPS * 1000) for k in fulls}
fl = json.load(open(f"{WORK}/mtrack.json"))["flick"]
s0, n = log["first"], log["segFrames"]
seg_fl = fl[s0 + 2:s0 + n]   # the first two frames compare across the join with the segment before: a cut, not flicker

out = {
    "id": fid, "file": mp4,
    "frames": {"expected": n_expect, "in_file": int(vs["nb_read_frames"]), "rate": vs["r_frame_rate"], "size": f"{vs['width']}x{vs['height']}",
               "decode_errors": len(dec.splitlines()) if dec else 0, "source_frame_skips": gaps},
    "sync": cues,
    "safe_area": {"box": SAFE, "frames_outside": viol, "frames_outside_in_motion": viol_moving, "frames_cut_off": cut, "first_offenders": offenders,
                  "text_extent": worst if worst[0] < 9999 else None},
    "face_cover_frames": cover,
    "read_ms": reads,
    "matte_flicker": {"median_pct": round(float(np.median(seg_fl)) * 100, 2), "max_pct": round(float(np.max(seg_fl)) * 100, 2)},
    "render_sec": round(log["renderSec"], 1), "page_errors": log["errors"][:3],
}
json.dump(out, open(base + ".measure.json", "w"), indent=1)
ok = (out["frames"]["in_file"] == n_expect and not out["frames"]["decode_errors"] and gaps == 0 and all(c["pass"] for c in cues)
      and viol == 0 and cut == 0 and cover == 0)
print(json.dumps(out))
print("PASS" if ok else "MISS")
