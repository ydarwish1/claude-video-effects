"""Person cut-out for a 1080x1920 clip with Robust Video Matting (mobilenetv3, ONNX, CPU).

  python -I matte.py <clip.mp4> <model.onnx> <alpha.mkv>

Frames stream through (memory stays flat). Writes the alpha matte at the clip's size as lossless FFV1 grey. RVM is
recurrent: its four state tensors carry from frame to frame, so the first 10 or so frames are a little softer.
Model: https://github.com/PeterL1n/RobustVideoMatting (the code is GPL-3.0; setup.sh downloads the model, it is not
part of this repo).
"""
import json
import subprocess
import sys
import time

import numpy as np
import onnxruntime as ort

clip, model, out = sys.argv[1:4]
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                "-of", "json", clip], capture_output=True, text=True).stdout)["streams"][0]
W, H = pr["width"], pr["height"]
so = ort.SessionOptions()
so.intra_op_num_threads = 0
sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
rec = [np.zeros([1, 1, 1, 1], np.float32)] * 4
dr = np.array([0.25 if max(W, H) > 1280 else 0.4], np.float32)
dec = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", clip, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", "30",
                        "-i", "-", "-c:v", "ffv1", "-level", "3", out], stdin=subprocess.PIPE)
n, t0 = 0, time.time()
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    src = np.frombuffer(buf, np.uint8).reshape(H, W, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255.0
    fgr, pha, *rec = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": dr})
    enc.stdin.write((np.clip(pha[0, 0], 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    n += 1
enc.stdin.close()
enc.wait()
dec.wait()
print(f"matte: {n} frames {W}x{H} in {time.time() - t0:.0f} s")
