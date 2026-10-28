"""Setup's last check: the two models load (the face tracker needs libEGL on Linux; importing mediapipe alone does
not show that). Prints OK or the error. python -I selftest.py <engine dir>"""
import os
import sys

E = sys.argv[1]
try:
    import cv2  # noqa: F401
    import numpy as np  # noqa: F401
    import onnxruntime as ort
    from mediapipe.tasks.python import BaseOptions, vision
    ort.InferenceSession(os.path.join(E, "models", "rvm_mobilenetv3_fp32.onnx"), providers=["CPUExecutionProvider"])
    vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(E, "models", "face_landmarker.task"))))
    print("OK")
except Exception as e:  # noqa: BLE001
    print("FAILED:", e)
    sys.exit(1)
