"""Download and cut the effects' sound hits (engine/sounds.json) into engine/sfx/<name>.wav, and write
engine/sfx/sfx.json (each hit's event point). Each sound is trimmed, faded (2 ms in, 20 ms out), optionally
re-pitched and high-passed, peak-normalised to -3 dBFS, 48 kHz stereo 16-bit. Skips files already made.

  python -I get_sounds.py <engine dir>
"""
import json
import os
import subprocess
import sys
import urllib.request

E = sys.argv[1]
spec = json.load(open(os.path.join(E, "sounds.json")))["sounds"]
out = os.path.join(E, "sfx")
cache = os.path.join(out, "downloads")
os.makedirs(cache, exist_ok=True)
meta, bad = {}, []
for s in spec:
    wav = os.path.join(out, s["name"] + ".wav")
    meta[s["name"]] = {"event": s["event"], "dur": round((s["end"] - s["start"]) / s.get("rate", 1.0), 3), "source": s["page"]}
    if os.path.exists(wav):
        continue
    raw = os.path.join(cache, os.path.basename(s["url"]))
    if not os.path.exists(raw):
        try:
            req = urllib.request.Request(s["url"], headers={"User-Agent": "Mozilla/5.0 claude-video-effects"})
            open(raw, "wb").write(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:  # noqa: BLE001
            bad.append(f"{s['name']}: {e}")
            continue
    af = [f"atrim={s['start']:.3f}:{s['end']:.3f}", "asetpts=PTS-STARTPTS"]
    if s.get("rate", 1.0) != 1.0:
        af += [f"asetrate={48000 * s['rate']:.0f}", "aresample=48000"]
    if s.get("highpass"):
        af.append(f"highpass=f={s['highpass']}:poles=2")
    d = (s["end"] - s["start"]) / s.get("rate", 1.0)
    af += ["afade=t=in:d=0.002", f"afade=t=out:st={max(0, d - 0.02):.3f}:d=0.02"]
    tmp = wav + ".tmp.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "2", "-af", ",".join(af), tmp], check=True)
    peak = subprocess.run(["ffmpeg", "-nostdin", "-v", "info", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    mx = float(peak.split("max_volume:")[1].split("dB")[0]) if "max_volume:" in peak else 0.0
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-af", f"volume={-3.0 - mx:.2f}dB", "-c:a", "pcm_s16le", wav], check=True)
    os.remove(tmp)
json.dump(meta, open(os.path.join(out, "sfx.json"), "w"), indent=1)
print(f"sounds: {len(spec) - len(bad)}/{len(spec)} ready in {out}")
for b in bad:
    print("MISSING", b)
sys.exit(1 if bad else 0)
