"""Turn a profile picture (any square-ish image) into the avatar file the effects read: a 540x960 JPEG with the
picture as a 540x540 square in the middle, so the avatar setting is crop [270, 480, 540].

  python -I avatar.py <picture> <work dir>/media/reels/avatar-540.jpg
"""
import os
import subprocess
import sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-vf",
                "scale=540:540:force_original_aspect_ratio=increase:flags=lanczos,crop=540:540,pad=540:960:0:210:black",
                "-frames:v", "1", "-q:v", "2", out], check=True)
print(out)
