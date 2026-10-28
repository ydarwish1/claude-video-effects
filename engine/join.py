"""Join rendered parts (each an MP4 with its own sound) into one reel, frame-exact, and set the level: the loudest
true peak at -1.5 dBTP. Writes the reel, a phone copy under 30 MB (two-pass x264) and a parts table (.parts.json).

  python -I join.py <out.mp4> <part.mp4> [<part.mp4> ...]
"""
import json
import re
import subprocess
import sys

out, parts = sys.argv[1], sys.argv[2:]
n = len(parts)
table, t = [], 0.0
for p in parts:
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                                    "stream=nb_read_frames", "-of", "json", p], capture_output=True, text=True).stdout)
    f = int(pr["streams"][0]["nb_read_frames"])
    table.append({"part": p, "start": round(t, 4), "frames": f})
    t += f / 30
ins = sum((["-i", p] for p in parts), [])
fc = "".join(f"[{k}:v]setpts=PTS-STARTPTS,fps=30[v{k}];[{k}:a]aresample=48000,asetpts=PTS-STARTPTS,apad,atrim=0:{table[k]['frames'] / 30:.5f}[a{k}];" for k in range(n))
fc += "".join(f"[v{k}][a{k}]" for k in range(n)) + f"concat=n={n}:v=1:a=1[v][a]"
tmp = out.replace(".mp4", "-raw.mp4")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264",
                "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", tmp.replace(".mp4", ".mov")], check=True)
tmp = tmp.replace(".mp4", ".mov")
st = subprocess.run(["ffmpeg", "-nostdin", "-v", "info", "-i", tmp, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                    capture_output=True, text=True).stderr
tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", st)[-1])
gain = -1.5 - tp
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-c:v", "copy", "-af",
                f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false:latency=true", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out], check=True)
st2 = subprocess.run(["ffmpeg", "-nostdin", "-v", "info", "-i", out, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", st2)[-1])
tp2 = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", st2)[-1])
dur = t
kbps = int(min(3500, (28 * 8 * 1024 * 1024 / dur - 160 * 1000) / 1000))
phone = out.replace(".mp4", "-phone.mp4")
for pas in (1, 2):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", out, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k",
                    "-pass", str(pas), "-passlogfile", out.replace(".mp4", "-2pass"), "-pix_fmt", "yuv420p",
                    *(["-an", "-f", "null", "/dev/null"] if pas == 1 else ["-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", phone])], check=True)
json.dump({"parts": table, "duration": round(dur, 4), "frames": sum(x["frames"] for x in table), "gain_db": round(gain, 2),
           "lufs": lufs, "true_peak_dbtp": tp2}, open(out.replace(".mp4", ".parts.json"), "w"), indent=1)
print(json.dumps({"out": out, "phone": phone, "duration": round(dur, 3), "frames": sum(x["frames"] for x in table), "lufs": lufs, "tp": tp2}))
