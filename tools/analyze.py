"""Measure a recorded piece so the image can be chosen from the sound, not before it.
usage: python3 analyze.py <piece.wav|mp3>   -> prints JSON: loudness arc, brightness, noisiness, peak
  arc: mean loudness (dB) of each 30 s, so you can see the shape (build, fade, holes)
  brightness: average spectral centroid in Hz (under ~900 dark, over ~1200 bright)
  noisiness: average spectral flatness (0 = tonal, higher = noisier/textural)
"""
import json, re, subprocess, sys

src = sys.argv[1]
ff = lambda *a: subprocess.run(['ffmpeg', '-hide_banner', *a, '-f', 'null', '-'], capture_output=True, text=True).stderr
h, m, sec = re.search(r'Duration: (\d+):(\d+):([\d.]+)', ff('-i', src)).groups()
dur = int(h) * 3600 + int(m) * 60 + float(sec)
arc = []
for t in range(0, int(dur), 30):
    m = re.search(r'mean_volume: ([-\d.]+)', ff('-ss', str(t), '-t', '30', '-i', src, '-af', 'volumedetect'))
    arc.append(round(float(m.group(1)), 1) if m else None)
peak = float(re.search(r'max_volume: ([-\d.]+)', ff('-i', src, '-af', 'volumedetect')).group(1))
out = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', src, '-af',
                      'aspectralstats=measure=centroid+flatness,ametadata=print:file=-', '-f', 'null', '-'],
                     capture_output=True, text=True).stdout
cent = [float(v) for v in re.findall(r'centroid=([\d.]+)', out)]
flat = [float(v) for v in re.findall(r'flatness=([\d.]+)', out)]
print(json.dumps({'arc': arc, 'brightness': round(sum(cent) / len(cent)), 'noisiness': round(sum(flat) / len(flat), 3),
                  'peak': peak}))
