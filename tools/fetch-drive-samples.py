"""Download the day's sounds from the shared Drive sound folder into <out>/<role>/<file>.
The files are shared "anyone with the link", so they come straight from drive.usercontent.google.com
(that host must be in the cloud environment's allowed domains). Listing the folders needs the Drive
connector, so Claude writes the plan file first (see RUNBOOK.md).
usage: python3 fetch-drive-samples.py <plan.json> <out dir>
  plan.json: {"folders": [{"role": "zoom", "files": [{"id": "...", "name": "ZOOM0017.WAV"}, ...]}, ...]}
"""
import json, pathlib, re, sys, urllib.request

MAX_BYTES = 60 * 1024 * 1024
URL = 'https://drive.usercontent.google.com/download?id={}&export=download&confirm=t'

plan, out = json.loads(pathlib.Path(sys.argv[1]).read_text()), pathlib.Path(sys.argv[2])
got = 0
for folder in plan['folders']:
    role = re.sub(r'[^\w.-]+', '_', folder['role']).strip('_') or 'sounds'
    for f in folder['files']:
        dest = out / role / pathlib.Path(f['name']).name
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            with urllib.request.urlopen(URL.format(f['id']), timeout=120) as r:
                if 'text/html' in r.headers.get('Content-Type', ''):
                    raise ValueError('got a web page, not audio (file not shared by link?)')
                size = int(r.headers.get('Content-Length') or 0)
                if size > MAX_BYTES:
                    raise ValueError(f'too big ({size >> 20} MB)')
                data = r.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError('too big')
            dest.write_bytes(data)
            got += 1
            print(f'ok   {role}/{dest.name} ({len(data) >> 20} MB)')
        except Exception as e:
            print(f'skip {role}/{dest.name}: {e}')
print(f'{got} files in {out}')
sys.exit(0 if got else 1)
