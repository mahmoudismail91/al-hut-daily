"""Make the files Al Hut keeps: the original WAV and a 320 kbps mp3, with the artwork and details embedded.
usage: python3 tag.py <piece.wav> <date> <full-size image> <out dir>   (run after publish.py; reads pieces.json)
Writes <out>/NN_<date>_Al Hut - Daily Mixer NN.wav and .mp3 (NN = the piece's number on the page).
Needs mutagen (pip install mutagen).
"""
import datetime, io, json, pathlib, shutil, subprocess, sys
from PIL import Image, ImageOps
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB, TDRC, TRCK, COMM, TCON
from mutagen.wave import WAVE

wav_in, date, image, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3]), pathlib.Path(sys.argv[4])
pieces = sorted(json.loads((pathlib.Path(__file__).parent.parent / 'pieces.json').read_text()), key=lambda p: p['date'])
n, p = next((i, p) for i, p in enumerate(pieces, 1) if p['date'] == date)
im = ImageOps.exif_transpose(Image.open(image)).convert('RGB'); im.thumbnail((1400, 1400))
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=90); art = buf.getvalue()
style = ' · '.join(x for x in [p['mode'].lower(), 'slices' + (f", hop {p['hop']}" if p['hop'] else '') if p['loops'] == 'SLICES' else 'full loops',
                               f"reverb {p['reverb']}" if p['reverb'] else '', f"delay {p['delay']}" if p['delay'] else '',
                               f"drive {p['drive']}" if p['drive'] else ''] if x)
text = (f"{p.get('note', '')}\n\nStyle: {style}\nFolders: {' / '.join(p['folders'])}\nSounds: {', '.join(p['sounds'])}\n"
        f"Image: {p.get('image_name', '')} ({p.get('image_why', '')})\nPlayed and recorded by Claude on the Mixer Abo Kalleb, from Al Hut's archive.")

def tag(t):
    t.add(TIT2(encoding=3, text=f"Daily Mixer #{n} · {datetime.date.fromisoformat(date).strftime('%-d %B %Y')}"))
    t.add(TPE1(encoding=3, text='Al Hut')); t.add(TALB(encoding=3, text='Daily Mixer (Mixer Abo Kalleb)'))
    t.add(TDRC(encoding=3, text=date)); t.add(TRCK(encoding=3, text=str(n))); t.add(TCON(encoding=3, text='Ambient'))
    t.add(COMM(encoding=3, lang='eng', desc='', text=text))
    t.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=art))

out.mkdir(parents=True, exist_ok=True)
base = out / f'{n:02d}_{date}_Al Hut - Daily Mixer {n}'
wav, mp3 = base.with_suffix('.wav'), base.with_suffix('.mp3')
shutil.copy(wav_in, wav)
w = WAVE(wav); w.add_tags(); tag(w.tags); w.save()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-map', '0:a', '-c:a', 'libmp3lame', '-b:a', '320k', str(mp3)], check=True)
t = ID3(); tag(t); t.save(mp3, v2_version=3)
print(wav); print(mp3)
