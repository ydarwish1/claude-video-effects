#!/bin/bash
# First run (2-5 minutes): a Python environment with the tracking libraries, Playwright's Chromium, the two models
# (person cut-out and face tracker) and the sound hits. Safe to run again: it skips what is already there.
# Prints READY when everything works, or NEED_<thing> and stops.
set -u
E="$(cd "$(dirname "$0")" && pwd)"
cd "$E"
command -v ffmpeg >/dev/null 2>&1 || { echo "NEED_FFMPEG (Mac: brew install ffmpeg; Linux: apt install ffmpeg)"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "NEED_NODE (Node.js 18 or newer: https://nodejs.org)"; exit 1; }
PY=""
for p in python3.12 python3.13 python3.11 python3; do command -v $p >/dev/null 2>&1 && { PY=$p; break; }; done
[ -n "$PY" ] || { echo "NEED_PYTHON (3.11-3.13)"; exit 1; }
if [ ! -x .venv/bin/python ]; then "$PY" -m venv .venv || { echo "NEED_PYTHON_VENV"; exit 1; }; fi
.venv/bin/python -m pip install -q --upgrade pip >/dev/null 2>&1
.venv/bin/python -m pip install -q -r requirements.txt || { echo "PIP_FAILED"; exit 1; }
if [ ! -d node_modules/playwright ]; then npm install --silent --no-audit --no-fund >/dev/null 2>&1 || { echo "NPM_FAILED"; exit 1; }; fi
npx --yes playwright install chromium >/dev/null 2>&1 || { echo "CHROMIUM_FAILED (try: npx playwright install --with-deps chromium)"; exit 1; }
mkdir -p models
[ -s models/rvm_mobilenetv3_fp32.onnx ] || curl -fsSL -o models/rvm_mobilenetv3_fp32.onnx \
  https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx || { echo "MODEL_DOWNLOAD_FAILED (matting)"; exit 1; }
[ -s models/face_landmarker.task ] || curl -fsSL -o models/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task || { echo "MODEL_DOWNLOAD_FAILED (face)"; exit 1; }
.venv/bin/python -I tools/selftest.py "$E" 2>/dev/null | grep -q '^OK' || { echo "MODELS_FAILED: $(.venv/bin/python -I tools/selftest.py "$E" 2>&1 | tail -1) (on Linux this is usually: apt install libegl1 libgl1)"; exit 1; }
.venv/bin/python -I get_sounds.py "$E" || { echo "SOUNDS_INCOMPLETE (renders still work; a missing hit is left out)"; }
echo READY
