// Renders the list of daily pieces into #pieces. Used by this page and by alhutmusic.com/daily.html.
(function () {
    const root = document.getElementById('pieces');
    const base = root.dataset.base || '';
    const fmt = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const styleLine = p => [
        p.mode.toLowerCase(), p.loops === 'SLICES' ? 'slices' + (p.hop ? `, hop ${p.hop}` : '') : 'full loops',
        p.reverb ? `reverb ${p.reverb}` : '', p.delay ? `delay ${p.delay}` : '', p.drive ? `drive ${p.drive}` : '',
    ].filter(Boolean).join(' · ');

    const css = document.createElement('style');
    css.textContent = `
        #pieces .cover { display: block; width: 100%; max-height: 520px; object-fit: cover; border: 2px solid #000; margin: 0 0 10px; }
        #pieces .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; margin: 8px 0; }
        #pieces .roles figure { margin: 0; }
        #pieces .roles img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border: 2px solid #000; }
        #pieces .roles figcaption { font-size: 0.8em; margin-top: 2px; }`;
    document.head.appendChild(css);

    fetch(base + 'pieces.json', { cache: 'no-cache' })
        .then(r => r.json())
        .then(list => {
            if (!list.length) { root.textContent = 'The first piece arrives tomorrow morning.'; return; }
            root.innerHTML = list.map((p, i) => `
                <article class="piece${i === 0 ? ' latest' : ''}">
                    <h3><span class="year-tag">#${list.length - i}</span>${esc(fmt(p.date))}</h3>
                    ${p.cover ? `<img class="cover" src="${base}${esc(p.cover)}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}">` : ''}
                    <audio controls preload="${i === 0 ? 'metadata' : 'none'}" src="${base}${esc(p.file)}"></audio>
                    <p class="meta">${esc(styleLine(p))}</p>
                    ${p.images ? `<div class="roles">${Object.entries(p.images).map(([role, src]) => `
                        <figure><img src="${base}${esc(src)}" alt="" loading="lazy"><figcaption>${esc(role)}</figcaption></figure>`).join('')}</div>`
                        : `<p class="sounds">${p.folders.map(esc).join(' / ')}</p>`}
                    <details><summary>${p.sounds.length} sounds</summary><ul>${p.sounds.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
                </article>`).join('');
            // one piece at a time
            root.addEventListener('play', e => root.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); }), true);
        })
        .catch(() => { root.textContent = 'Could not load the pieces right now.'; });
})();
