"""Prepare a talking-head video for the effects: a 1080x1920, 30 fps clip, the speaker's cut-out (alpha matte), a
face track and a body track. Run once per video (or per part of a video); every effect then renders from it.

  python -I prep.py <video> <work dir> [--start S] [--end E] [--crop-x X]

--start/--end (seconds of the video) keep only that part: the matte runs at roughly 5-10 s of work per second of
video on a laptop CPU, so prepare the parts you will use. The frame is cropped to 9:16 around the face (found on
the middle frame) unless --crop-x gives the left edge of the crop in scaled pixels.
Writes <work>/clip.mp4, alpha.mkv, face.json, mtrack.json and prep.json.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

E = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("work")
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--end", type=float, default=None)
ap.add_argument("--crop-x", type=int, default=None)
a = ap.parse_args()
os.makedirs(a.work, exist_ok=True)


def probe(path):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", path],
                                  capture_output=True, text=True, check=True).stdout)
    s = j["streams"][0]
    w, h = s["width"], s["height"]
    for sd in s.get("side_data_list") or []:
        if int(sd.get("rotation") or 0) % 180:
            w, h = h, w
    return w, h, float(j["format"]["duration"])


w, h, dur = probe(a.video)
end = min(a.end or dur, dur)
k = max(1080 / w, 1920 / h)                       # scale so the frame covers 1080x1920
sw, sh = int(round(w * k / 2)) * 2, int(round(h * k / 2)) * 2
crop_x = a.crop_x
if crop_x is None:
    # centre the crop on the face of the middle frame (MediaPipe, image mode); fall back to the middle
    crop_x = (sw - 1080) // 2
    if sw > 1080:
        mid = a.start + (end - a.start) / 2
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{mid:.3f}", "-i", a.video, "-frames:v", "1", "-vf",
                              f"scale={sw}:{sh}", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], capture_output=True).stdout
        if len(raw) == sw * sh * 3:
            try:
                import mediapipe as mp
                from mediapipe.tasks.python import BaseOptions, vision
                lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=os.path.join(E, "models", "face_landmarker.task")), num_faces=1))
                r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.frombuffer(raw, np.uint8).reshape(sh, sw, 3).copy()))
                if r.face_landmarks:
                    cx = r.face_landmarks[0][1].x * sw
                    crop_x = int(min(max(cx - 540, 0), sw - 1080))
            except Exception as e:  # noqa: BLE001
                print("face centring skipped:", e)
clip = os.path.join(a.work, "clip.mp4")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{a.start:.3f}", "-to", f"{end:.3f}", "-i", a.video,
                "-vf", f"scale={sw}:{sh}:flags=lanczos,crop=1080:1920:{crop_x}:0,setsar=1,fps=30", "-c:v", "libx264", "-preset", "slow",
                "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", clip], check=True)
frames = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames",
                             "-of", "csv=p=0", clip], capture_output=True, text=True).stdout.strip())
print(f"clip: {frames} frames ({frames / 30:.2f} s), crop x {crop_x} of {sw}")
T = os.path.join(E, "tools")
subprocess.run([PY, "-I", os.path.join(T, "matte.py"), clip, os.path.join(E, "models", "rvm_mobilenetv3_fp32.onnx"),
                os.path.join(a.work, "alpha.mkv")], check=True)
subprocess.run([PY, "-I", os.path.join(T, "face_track.py"), clip, os.path.join(E, "models", "face_landmarker.task"),
                os.path.join(a.work, "face.json")], check=True)
subprocess.run([PY, "-I", os.path.join(T, "matte_track.py"), clip, os.path.join(a.work, "alpha.mkv"),
                os.path.join(a.work, "mtrack.json")], check=True)
json.dump({"source": os.path.abspath(a.video), "start": a.start, "end": end, "frames": frames, "crop_x": crop_x, "scaled": [sw, sh]},
          open(os.path.join(a.work, "prep.json"), "w"), indent=1)
print("PREPARED", a.work)
