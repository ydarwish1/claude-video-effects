"""Face track for the fx elements: every frame of a 1080x1920 clip through MediaPipe FaceLandmarker.

  python -I face_track.py <clip.mp4> <model.task> <out.json>

Writes one row per frame, every value a fraction of the frame (x of the width, y of the height), smoothed with a
One Euro filter (min cutoff 1.2 Hz, beta 0.6) so graphics pinned to the face do not shake:
  face  1 when a face was found (a missing frame repeats the last good row)
  x0 y0 x1 y1   face box from all 478 landmarks
  nx ny   nose tip (1)     tx ty  forehead top (10)    cx cy  chin (152)
  mx my   mouth centre (13 + 14)    lx ly / rx ry  eye centres (33+133 / 362+263, image left / right)
  open    mouth gap (13 to 14) over face height, raw (not smoothed: it drives the voice line)
  yaw pitch roll  degrees from the facial transformation matrix
"""
import json
import math
import subprocess
import sys

import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

clip, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
W, H, FPS = 540, 960, 30.0

lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model), running_mode=vision.RunningMode.VIDEO, num_faces=1,
    output_face_blendshapes=False, output_facial_transformation_matrixes=True))


class OneEuro:
    def __init__(self, mincut=1.2, beta=0.6, dcut=1.0):
        self.mincut, self.beta, self.dcut, self.x, self.dx = mincut, beta, dcut, None, 0.0

    @staticmethod
    def alpha(cut):
        tau = 1.0 / (2 * math.pi * cut)
        return 1.0 / (1.0 + tau * FPS)

    def __call__(self, v):
        if self.x is None:
            self.x = v
            return v
        dx = (v - self.x) * FPS
        self.dx += self.alpha(self.dcut) * (dx - self.dx)
        cut = self.mincut + self.beta * abs(self.dx)
        self.x += self.alpha(cut) * (v - self.x)
        return self.x


COLS = ["face", "x0", "y0", "x1", "y1", "nx", "ny", "tx", "ty", "cx", "cy", "mx", "my", "lx", "ly", "rx", "ry",
        "open", "yaw", "pitch", "roll"]
SMOOTH = [c for c in COLS if c not in ("face", "open")]
filt = {c: OneEuro() for c in SMOOTH}

proc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", clip, "-vf", f"scale={W}:{H}", "-pix_fmt", "rgb24",
                         "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
rows, last, i, missing = [], None, 0, 0
while True:
    buf = proc.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(f)), int(round(i * 1000 / FPS)))
    if r.face_landmarks:
        p = r.face_landmarks[0]
        xs, ys = [q.x for q in p], [q.y for q in p]
        mid = lambda a, b: ((p[a].x + p[b].x) / 2, (p[a].y + p[b].y) / 2)
        m = np.array(r.facial_transformation_matrixes[0])
        R = m[:3, :3]
        pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
        yaw = math.degrees(math.asin(max(-1.0, min(1.0, -R[2, 0]))))
        roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
        (mx, my), (lx, ly), (rx, ry) = mid(13, 14), mid(33, 133), mid(362, 263)
        fh = max(ys) - min(ys)
        raw = dict(face=1, x0=min(xs), y0=min(ys), x1=max(xs), y1=max(ys), nx=p[1].x, ny=p[1].y, tx=p[10].x, ty=p[10].y,
                   cx=p[152].x, cy=p[152].y, mx=mx, my=my, lx=lx, ly=ly, rx=rx, ry=ry,
                   open=abs(p[14].y - p[13].y) / fh if fh > 0 else 0, yaw=yaw, pitch=pitch, roll=roll)
        last = raw
    else:
        missing += 1
        raw = dict(last or {c: 0 for c in COLS})
        raw["face"] = 0
    row = [raw["face"]]
    for c in COLS[1:]:
        v = raw[c]
        row.append(round(filt[c](v), 5) if c in SMOOTH else round(v, 4))
    rows.append(row)
    i += 1
proc.wait()
json.dump({"clip": clip, "fps": FPS, "frames": i, "missing": missing, "cols": COLS, "rows": rows}, open(out, "w"),
          separators=(",", ":"))
print(f"frames {i}, no face {missing}")
