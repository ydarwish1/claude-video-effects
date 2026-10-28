"""Frames of a finished effect render for a grid tile (the hook or the end card of effects-grid): every frame from
--skip on (skip the app-frame intro: 40 frames when the render starts with FxAppShell), at 456x810 JPEG.

  python -I tiles.py <render.mp4> <out folder> [--skip 0]
Prints the frame count, which is the tile's "n".
"""
import argparse
import os
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument("render")
ap.add_argument("out")
ap.add_argument("--skip", type=int, default=0)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", a.render, "-vf", f"select=gte(n\\,{a.skip}),scale=456:810",
                "-fps_mode", "passthrough", "-q:v", "3", "-start_number", "0", os.path.join(a.out, "%05d.jpg")], check=True)
print(len([f for f in os.listdir(a.out) if f.endswith(".jpg")]))
