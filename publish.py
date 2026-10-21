"""Add a recorded piece to this site: encodes a 128 kbps mp3 into pieces/ and puts its entry first in pieces.json.
Keeps the newest KEEP pieces so the site stays under GitHub Pages' 1 GB limit.
usage: python3 publish.py <piece.mp3> <piece.json> [--image path --why "..."] [--note "..."]
  (the json written by tools/daily-piece.js; one image per piece, shrunk to a small 96 px square JPEG,
   its name kept as image_name so it isn't reused within 30 pieces)
"""
import argparse, json, pathlib, subprocess

from PIL import Image, ImageOps

KEEP = 150

here = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument('mp3', type=pathlib.Path)
ap.add_argument('meta', type=pathlib.Path)
ap.add_argument('--image', type=pathlib.Path, help='one image for the piece')
ap.add_argument('--why', help='one line: why this image fits this sound')
ap.add_argument('--note', help='a short listening note about the piece')
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
analysis = subprocess.run(['python3', str(here / 'tools' / 'analyze.py'), str(dest)], capture_output=True, text=True, check=True)
entry['analysis'] = json.loads(analysis.stdout)
if a.note:
    entry['note'] = a.note
img = dest.with_suffix('.jpg')
img.unlink(missing_ok=True)
if a.image:
    im = ImageOps.fit(ImageOps.exif_transpose(Image.open(a.image)).convert('RGB'), (96, 96))
    im.save(img, quality=85, optimize=True)
    entry['image'] = f"pieces/{img.name}"
    entry['image_name'] = a.image.stem
    if a.why:
        entry['image_why'] = a.why
index = here / 'pieces.json'
pieces = json.loads(index.read_text()) if index.exists() else []
# Al Hut's verdict (keep / maybe / skip) survives a re-publish of the same day
entry['verdict'] = next((p.get('verdict') for p in pieces if p['date'] == meta['date']), None)
pieces = [p for p in pieces if p['date'] != meta['date']]
pieces = [entry] + pieces
for old in pieces[KEEP:]:
    (here / old['file']).unlink(missing_ok=True)
    (here / old['file']).with_suffix('.jpg').unlink(missing_ok=True)
pieces = pieces[:KEEP]
index.write_text(json.dumps(pieces, indent=1, ensure_ascii=False) + '\n')
print(f"added {entry['file']} ({len(pieces)} pieces)")
