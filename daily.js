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

    // Listener ratings live in a small Supabase table (setup: tools/ratings.sql). Off until DAILY_RATINGS is filled in.
    const db = window.DAILY_RATINGS && window.DAILY_RATINGS.url ? window.DAILY_RATINGS : null;
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    };
    const visitor = () => {
        let id = store.get('daily-visitor');
        if (!id) { id = crypto.randomUUID(); store.set('daily-visitor', id); }
        return id;
    };
    const api = (path, body, prefer) => fetch(db.url.replace(/\/$/, '') + '/rest/v1/' + path, {
        method: 'POST',
        headers: { apikey: db.key, Authorization: 'Bearer ' + db.key, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
        body: JSON.stringify(body),
    });
    const starRow = (n, cls) => [1, 2, 3, 4, 5].map(i => `<button type="button" class="${cls}" data-stars="${i}" aria-label="${i} of 5">${i <= n ? '★' : '☆'}</button>`).join('');

    function renderListeners(stats) {
        root.querySelectorAll('.listeners').forEach(el => {
            const piece = el.dataset.piece, st = stats[piece], mine = parseInt(store.get('daily-rated-' + piece), 10) || 0;
            el.innerHTML = `${st ? `listeners ★ ${st.average} (${st.votes})` : 'no listener ratings yet'} · ${mine ? 'you gave' : 'your stars'} `
                + `<span class="rate">${starRow(mine, mine ? 'given' : 'give')}</span>`;
        });
    }
    function loadStats() {
        return api('rpc/piece_stats', {}).then(r => r.json())
            .then(rows => Object.fromEntries(rows.map(r => [r.piece, r])))
            .catch(() => ({}));
    }
    if (db) root.addEventListener('click', e => {
        const b = e.target.closest('button.give');
        if (!b) return;
        const piece = b.closest('.listeners').dataset.piece, stars = +b.dataset.stars;
        api('ratings?on_conflict=piece,visitor', { piece, visitor: visitor(), stars }, 'resolution=ignore-duplicates,return=minimal')
            .then(r => { if (!r.ok) throw r; store.set('daily-rated-' + piece, stars); return loadStats(); })
            .then(renderListeners)
            .catch(() => { b.closest('.listeners').append(' (could not save, try later)'); });
    });

    const css = document.createElement('style');
    css.textContent = `
        #pieces .pic { width: 48px; height: 48px; object-fit: cover; border: 2px solid #000; vertical-align: middle; margin-right: 8px; }
        #pieces .note { font-style: italic; margin: 6px 0; }
        #pieces .stars { margin-left: 10px; letter-spacing: 2px; vertical-align: middle; }
        #pieces .listeners { font-size: 0.9em; margin: 6px 0; }
        #pieces .rate button { background: none; border: 0; padding: 0 1px; font: inherit; font-size: 1.15em; color: inherit; }
        #pieces .rate button.give { cursor: pointer; }
        #pieces .rate:hover button.give { color: #c60; }
        #pieces .rate button.give:hover ~ button.give { color: inherit; }`;
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
                    ${db ? `<p class="listeners" data-piece="${esc(p.date)}"></p>` : ''}
                    <p class="sounds">${p.folders.map(esc).join(' / ')}</p>
                    <details><summary>${p.sounds.length} sounds</summary><ul>${p.sounds.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
                </article>`).join('');
            if (db) { renderListeners({}); loadStats().then(renderListeners); }
            // one piece at a time
            root.addEventListener('play', e => root.querySelectorAll('audio').forEach(a => { if (a !== e.target) a.pause(); }), true);
        })
        .catch(() => { root.textContent = 'Could not load the pieces right now.'; });
})();
