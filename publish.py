"""Add a recorded piece to this site: encodes a 128 kbps mp3 into pieces/ and puts its entry first in pieces.json.
Keeps the newest KEEP pieces so the site stays under GitHub Pages' 1 GB limit.
usage: python3 publish.py <piece.mp3> <piece.json> [--image role=path ...] [--cover role]
  (the json written by daily-piece.js; one image per sound folder/role, shrunk to 900 px JPEGs)
"""
import argparse, json, pathlib, shutil, subprocess

from PIL import Image, ImageOps

KEEP = 150

here = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument('mp3', type=pathlib.Path)
ap.add_argument('meta', type=pathlib.Path)
ap.add_argument('--image', action='append', default=[], help='role=path')
ap.add_argument('--cover', help='role whose image is the cover (default: first --image)')
a = ap.parse_args()
mp3, meta = a.mp3, json.loads(a.meta.read_text())
dest = here / 'pieces' / f"{meta['date']}.mp3"
dest.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-codec:a', 'libmp3lame', '-b:a', '128k', str(dest)], check=True)

# "drive/<role>/<file>" -> role list and file names
sounds = [s.split('/', 1)[-1] for s in meta['sounds']]
entry = {k: meta[k] for k in ('date', 'minutes', 'mode', 'loops', 'hop', 'reverb', 'delay', 'drive')}
entry.update(file=f"pieces/{dest.name}", folders=sorted({s.split('/')[0] for s in sounds}),
             sounds=[s.split('/')[-1] for s in sounds])
images = {}
img_dir = here / 'pieces' / meta['date']
shutil.rmtree(img_dir, ignore_errors=True)
for spec in a.image:
    role, path = spec.split('=', 1)
    img_dir.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    im.thumbnail((900, 900))
    out = img_dir / f"{role}.jpg"
    im.save(out, quality=82, optimize=True)
    images[role] = f"pieces/{meta['date']}/{out.name}"
if images:
    entry.update(images=images, cover=images[a.cover or next(iter(images))])
index = here / 'pieces.json'
pieces = [p for p in json.loads(index.read_text()) if p['date'] != meta['date']] if index.exists() else []
pieces = [entry] + pieces
for old in pieces[KEEP:]:
    (here / old['file']).unlink(missing_ok=True)
    shutil.rmtree(here / 'pieces' / old['date'], ignore_errors=True)
pieces = pieces[:KEEP]
index.write_text(json.dumps(pieces, indent=1, ensure_ascii=False) + '\n')
print(f"added {entry['file']} ({len(pieces)} pieces)")
