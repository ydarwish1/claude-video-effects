"""Matte and voice data for the fx elements, from the person matte (alpha.mkv) and the clip's sound.

  python -I matte_track.py <clip.mp4> <alpha.mkv> <out.json>

Per frame (1080x1920, values are fractions of the frame unless named px):
  grid   mean alpha in 40 px cells, 27 across x 48 down, 0-255, base64 per frame: where the body is, for contact tests
  top    the body's top edge in 54 columns of 20 px (first row with alpha over 50 %), 1 = no body in that column
  box    body box [x0, y0, x1, y1] of alpha over 50 %
  flick  matte flicker: share of edge pixels (alpha 10-90 %) whose alpha jumps over 25 % one way and back the next frame
Voice: rms at 120 per second (25 ms windows), scaled so the 99th percentile is 1.
"""
import base64
import json
import subprocess
import sys

import numpy as np

clip, alpha, out = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1080, 1920
proc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", alpha, "-pix_fmt", "gray", "-f", "rawvideo", "-"],
                        stdout=subprocess.PIPE)
grid, top, box, flick = [], [], [], []
prev2 = prev = None
while True:
    buf = proc.stdout.read(W * H)
    if len(buf) < W * H:
        break
    a = np.frombuffer(buf, np.uint8).reshape(H, W)
    g = a.reshape(48, 40, 27, 40).mean(axis=(1, 3)).astype(np.uint8)
    grid.append(base64.b64encode(g.tobytes()).decode())
    on = a > 127
    cols = on.reshape(H, 54, 20).any(axis=2)
    first = np.where(cols.any(axis=0), cols.argmax(axis=0), H)
    top.append([round(v / H, 4) for v in first.tolist()])
    ys, xs = np.nonzero(on[::4, ::4])
    box.append([round(xs.min() * 4 / W, 4), round(ys.min() * 4 / H, 4), round(xs.max() * 4 / W, 4), round(ys.max() * 4 / H, 4)]
               if len(xs) else [0, 0, 0, 0])
    if prev2 is not None:
        p = prev.astype(np.int16)
        d1, d2 = p - prev2.astype(np.int16), a.astype(np.int16) - p
        edge = (p > 25) & (p < 230)
        jump = (np.abs(d1) > 64) & (np.abs(d2) > 64) & (np.sign(d1) != np.sign(d2))
        n = int(edge.sum())
        flick.append(round(float((jump & edge).sum()) / n, 5) if n else 0.0)
    else:
        flick.append(0.0)
    prev2, prev = prev, a
proc.wait()
flick.append(0.0)

pcm = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", clip, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "-"],
                     capture_output=True, check=True).stdout
s = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
hop, win = 400, 1200
n = max(0, (len(s) - win) // hop + 1)
rms = np.array([np.sqrt(np.mean(s[i * hop:i * hop + win] ** 2)) for i in range(n)])
rms = np.clip(rms / (np.percentile(rms, 99) + 1e-9), 0, 1.5)

json.dump({"frames": len(grid), "grid": {"cols": 27, "rows": 48, "cell": 40}, "gridB64": grid, "top": top, "topCols": 54,
           "box": box, "flick": flick, "voice": {"rate": 120, "rms": [round(float(v), 3) for v in rms]}},
          open(out, "w"), separators=(",", ":"))
print(f"frames {len(grid)}, voice {len(rms)} samples, flicker max {max(flick):.4f} median {float(np.median(flick)):.5f}")
