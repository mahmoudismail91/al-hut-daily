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
        #pieces .pic { width: 48px; height: 48px; object-fit: cover; border: 2px solid #000; vertical-align: middle; margin-right: 8px; }
        #pieces .note { font-style: italic; margin: 6px 0; }
        #pieces .stars { margin-left: 10px; letter-spacing: 2px; vertical-align: middle; }`;
    document.head.appendChild(css);

    fetch(base + 'pieces.json', { cache: 'no-cache' })
        .then(r => r.json())
        .then(list => {
            if (!list.length) { root.textContent = 'The first piece arrives tomorrow morning.'; return; }
            root.innerHTML = list.map((p, i) => `
                <article class="piece${i === 0 ? ' latest' : ''}">
                    <h3>${p.image ? `<img class="pic" src="${base}${esc(p.image)}" alt="${esc(p.image_name || '')}" title="${esc(p.image_why || p.image_name || '')}" loading="lazy">` : ''}<span class="year-tag">#${list.length - i}</span>${esc(fmt(p.date))}${p.rating ? `<span class="stars" title="Al Hut's rating: ${p.rating} of 5">${'★'.repeat(p.rating)}${'☆'.repeat(5 - p.rating)}</span>` : ''}</h3>
                    <audio controls preload="${i === 0 ? 'metadata' : 'none'}" src="${base}${esc(p.file)}"></audio>
                    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
                    <p class="meta">${esc(styleLine(p))}</p>
                    <p class="sounds">${p.folders.map(esc).join(' / ')}</p>
                    <details><summary>${p.sounds.length} sounds</summary><ul>${p.sounds.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
                </article>`).join('');
            // one piece at a time
            root.addEventListener('play', e => root.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); }), true);
        })
        .catch(() => { root.textContent = 'Could not load the pieces right now.'; });
})();
