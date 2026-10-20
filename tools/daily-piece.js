// Plays the Mixer Abo Kalleb in headless Chromium and records one piece with the app's own WAV recorder.
// usage: node daily-piece.js <mixer index.html> <sounds dir named "drive"> <out dir> [--minutes 5] [--date YYYY-MM-DD]
// The sounds dir holds one subfolder per role (drive/<role>/<file>), so every subfolder becomes a Folder Role.
// Writes <out>/<date>.wav and <out>/<date>.json (the json publish.py reads).
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args.splice(i, 2)[1]; };
const minutes = parseFloat(opt('minutes', '5'));
const date = opt('date', new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' }));
const [mixerHtml, soundsDir, outDir] = args;
if (!outDir) { console.error('usage: node daily-piece.js <mixer index.html> <sounds dir> <out dir> [--minutes 5] [--date YYYY-MM-DD]'); process.exit(2); }

const pick = list => list[Math.floor(Math.random() * list.length)];
const rand = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) * 100) / 100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A random style. Effects are often off, so pieces don't all sound washed out.
const style = {
    mode: Math.random() < 0.6 ? 'AMBIENT' : 'STANDARD',
    loops: Math.random() < 0.5 ? 'FULL' : 'SLICES',
    reverb: Math.random() < 0.7 ? rand(0.15, 0.7) : 0,
    delay: Math.random() < 0.4 ? rand(0.1, 0.5) : 0,
    drive: Math.random() < 0.3 ? rand(0.1, 0.5) : 0,
    density: Math.round(rand(15, 40)),
};
style.hop = style.loops === 'SLICES' && Math.random() < 0.6 ? pick([1, 2, 4]) : 0;

// AudioWorklet needs a secure context, so serve the mixer from localhost instead of file://
function serve(dir) {
    const types = { '.html': 'text/html', '.gif': 'image/gif', '.webp': 'image/webp', '.js': 'text/javascript' };
    const server = http.createServer((req, res) => {
        const file = path.join(dir, path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '') || 'index.html');
        if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

(async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const server = await serve(path.dirname(path.resolve(mixerHtml)));
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
    page.on('pageerror', e => console.error('page error:', e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/${path.basename(mixerHtml)}`);

    await page.setInputFiles('#folder-upload', path.resolve(soundsDir));
    await page.waitForFunction(() => allFiles.length > 0);
    console.log(await page.textContent('#status-label'));

    if (style.mode === 'AMBIENT') await page.click('#btn-mode');
    if (style.loops === 'SLICES') await page.click('#btn-loops');
    await page.selectOption('#sel-hop', String(style.hop));
    await page.evaluate(s => ['reverb', 'delay', 'drive', 'density'].forEach(id => {
        const el = document.getElementById('sl-' + id);
        el.value = s[id];
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }), style);
    console.log('style', JSON.stringify(style));

    await page.click('#btn-play');
    await page.waitForFunction(() => activeTracks.length > 0, null, { timeout: 120000 });
    await sleep(1500);

    const heard = new Set();
    const listen = async () => (await page.evaluate(() => activeTracks.map(t => fileKey(t.file)))).forEach(k => heard.add(k));
    const download = page.waitForEvent('download', { timeout: (minutes * 60 + 300) * 1000 });
    await page.click('#btn-record');
    const end = Date.now() + minutes * 60000;
    // Standard mode holds one combination, so play it like a person would: NEXT MIX now and then.
    let nextMix = Date.now() + rand(45, 90) * 1000;
    while (Date.now() < end) {
        await sleep(Math.min(5000, end - Date.now()));
        await listen();
        if (style.mode === 'STANDARD' && Date.now() > nextMix && end - Date.now() > 30000) {
            await page.click('#btn-next');
            nextMix = Date.now() + rand(45, 90) * 1000;
        }
    }
    await page.click('#btn-record');
    const wav = path.join(outDir, `${date}.wav`);
    await (await download).saveAs(wav);
    await page.click('#btn-play');
    await browser.close();
    server.close();

    const meta = { date, minutes, mode: style.mode, loops: style.loops, hop: style.hop,
                   reverb: style.reverb, delay: style.delay, drive: style.drive, sounds: [...heard] };
    fs.writeFileSync(path.join(outDir, `${date}.json`), JSON.stringify(meta, null, 1) + '\n');
    console.log(`wrote ${wav} (${(fs.statSync(wav).size / 1e6).toFixed(1)} MB), ${heard.size} sounds heard`);
})().catch(e => { console.error(e); process.exit(1); });
