# Daily Mixer runbook

Every morning: one ~5 minute piece with the Mixer Abo Kalleb from random sounds in Al Hut's Drive.
**Private: only Al Hut listens.** Never mention alhutmusic.com. The GitHub page is on but hidden
(not indexed, not linked anywhere): never post or share its address.

Needs: this repo (push), the Google Drive connector, network access to `drive.usercontent.google.com`,
`ffmpeg`, Pillow, and Playwright's Chromium (preinstalled in the cloud container).
Work in a scratch dir `$S`.

## 1. Pick the sounds

1. List the sound folder with the Drive connector: `search_files` with
   `parentId = '10H-v9L2-N1uQQ-gf3HNYAaJH7rFqBnCT'` (it pages; folders only matter).
2. Skip folders used recently: `jq -r '.[:7][].folders[]' pieces.json | sort -u`.
   Skip zips and folders of finished masters/mixes (EP_release, malu_production) most days.
3. Pick 3 to 5 folders at random. For each, list audio:
   `parentId = '<folder id>' and mimeType contains 'audio/'`. If a folder only has subfolders, go one level down.
4. Pick 1 to 4 files per folder, each 60 MB or less (`fileSize`), ~8 to 12 files in all. Skip `.asd`.
5. Write `$S/plan.json`, role = Drive folder name:
   `{"folders": [{"role": "ZoomRecordings", "files": [{"id": "...", "name": "ZOOM0038.WAV"}]}]}`
6. `python3 -I tools/fetch-drive-samples.py $S/plan.json $S/drive` (the dir must be named `drive`).

## 2. Record

```
git clone --depth 1 https://github.com/mahmoudismail91/abo-kalleb-mixer-web $S/mixer
cd $S && NODE_PATH=$(npm root -g) node <repo>/tools/daily-piece.js $S/mixer/index.html $S/drive $S/out --minutes 5
```

It picks a random style (Ambient/Standard, full loops or slices, hop, reverb/delay/drive), loads each
subfolder as a Folder Role, records with the app's WAV recorder in real time (~6 min) and writes
`$S/out/<date>.wav` and `<date>.json`. Date defaults to today in Europe/Berlin.
Run it in the background and wait for it. Try a `--minutes 0.3 --date test` run first if anything changed.
Check it isn't silent: `ffmpeg -i out/<date>.wav -af volumedetect -f null - 2>&1 | grep max_volume`.

## 3. Listen through the numbers, then pick ONE image

Sound comes first: only choose the image once the piece is recorded.
`python3 tools/analyze.py $S/out/<date>.wav` gives the loudness arc (dB per 30 s: builds, fades, holes),
brightness (spectral centroid: under ~900 Hz dark, over ~1200 bright) and noisiness (0 tonal, higher textural).
Read those together with the sources and the style, write a short listening note (1 to 2 sentences, what the
piece does, not a list of settings), then choose the image whose mood, color and density fit that note.
Write one line on why (`--why`). Al Hut checks these reasons, so be specific and honest.

Image rules:

- Only clearly his own work as a clean digital file: artwork exports, covers, digital drawings, scans.
- No phone photos of prints or screens, no screenshots, no photos of objects, no HEIC, no DSC folders.
- No nudity ("CCF12062015-3 copy.jpg" is out).
- Not used in the last 30 pieces: `jq -r '.[:30][].image_name // empty' pieces.json`.
- Good source: Drive folder `1__ZfghdQl1P8tgPNHGmdkhPDbpydPd7E` (place by the fire, brokendreamsupermarket,
  store fo buying prespectives, ssss1, lost in the sea timeline, ...). Its `SKM_C224e...` files are
  scanner output: look before using. Also fine: "memorymanalbum_3000_final.jpg".
- Images aren't shared by link: download with the connector's `download_file_content`. The result is
  saved to a file; `jq -r .content <file> | base64 -d > "$S/<image name>.jpg"`. Keep the real name:
  publish.py stores the file stem as `image_name`. Look at it before using it.

## 4. Publish

```
python3 publish.py $S/out/<date>.wav $S/out/<date>.json --image "$S/<image name>.jpg" \
  --note "<listening note>" --why "<why this image fits this sound>"
git add -A pieces pieces.json && git commit -m "Daily piece <date>" && git push origin main
```

## 5. Send it to Al Hut

Send him both files with SendUserFile (status proactive, so it reaches his phone): the original
`$S/out/<date>.wav` (it is not kept anywhere else, so never skip it) and `pieces/<date>.mp3`,
with the listening note and the image reason.
When Al Hut gives a verdict on a piece (keep / maybe / skip), set `verdict` on its entry in pieces.json and push. Email can't carry them (the Gmail tool needs
the attachment inline). No links.
