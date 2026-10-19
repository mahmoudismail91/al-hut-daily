"""Add a recorded piece to this site: encodes a 128 kbps mp3 into pieces/ and puts its entry first in pieces.json.
Keeps the newest KEEP pieces so the site stays under GitHub Pages' 1 GB limit.
usage: python3 publish.py <piece.mp3> <piece.json>   (the json written by daily-piece.js)
"""
import json, pathlib, subprocess, sys

KEEP = 150

here = pathlib.Path(__file__).parent
mp3, meta = pathlib.Path(sys.argv[1]), json.loads(pathlib.Path(sys.argv[2]).read_text())
dest = here / 'pieces' / f"{meta['date']}.mp3"
dest.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp3), '-codec:a', 'libmp3lame', '-b:a', '128k', str(dest)], check=True)

# "drive/<role>/<file>" -> role list and file names
sounds = [s.split('/', 1)[-1] for s in meta['sounds']]
entry = {k: meta[k] for k in ('date', 'minutes', 'mode', 'loops', 'hop', 'reverb', 'delay', 'drive')}
entry.update(file=f"pieces/{dest.name}", folders=sorted({s.split('/')[0] for s in sounds}),
             sounds=[s.split('/')[-1] for s in sounds])
index = here / 'pieces.json'
pieces = [p for p in json.loads(index.read_text()) if p['date'] != meta['date']] if index.exists() else []
pieces = [entry] + pieces
for old in pieces[KEEP:]:
    (here / old['file']).unlink(missing_ok=True)
pieces = pieces[:KEEP]
index.write_text(json.dumps(pieces, indent=1, ensure_ascii=False) + '\n')
print(f"added {entry['file']} ({len(pieces)} pieces)")
