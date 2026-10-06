// Decodes a VGK fixer report from the URL fragment (#1z.<deflate-raw base64url> or #1u.<base64url>).
// The fragment is never sent to the server. Everything decoded is untrusted: it is size-capped,
// validated, and rendered with textContent only.
(async () => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const str = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const MAX_BYTES = 65536;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fromB64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function inflate(bytes) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) throw new Error('report too large');
      chunks.push(value);
    }
    const out = new Uint8Array(total); let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
  }

  async function decode(hash) {
    const m = hash.match(/^#1([zu])\.([A-Za-z0-9_-]{1,16000})$/);
    if (!m) return null;
    let bytes = fromB64u(m[2]);
    if (m[1] === 'z') bytes = await inflate(bytes);
    if (bytes.length > MAX_BYTES) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function sanitize(p) {
    if (!p || p.v !== 1 || !Array.isArray(p.st)) return null;
    const STATUS = ['success', 'warning', 'error', 'running', 'pending'];
    const n = p.n && typeof p.n === 'object' ? p.n : {};
    return {
      demo: p.demo === true,
      overall: str(p.o, 20),
      at: str(p.at, 40),
      runTime: str(p.rt, 12),
      net: { kind: str(n.k, 20), speed: str(n.s, 20), adapter: str(n.a, 80) },
      steps: p.st.slice(0, 8).filter(Array.isArray).map(x => ({ title: str(x[0], 60), status: STATUS.includes(x[1]) ? x[1] : 'pending', detail: str(x[2], 240) })),
      issues: (Array.isArray(p.is) ? p.is : []).slice(0, 6).filter(Array.isArray).map(x => ({ kind: x[0] === 'err' ? 'err' : 'warn', text: str(x[1], 240) }))
    };
  }

  const PATH = { ok: 'M5 12.5l4.5 4.5L19 7.5', err: 'M7 7l10 10M17 7L7 17' };
  function svgIcon(d) {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), p = document.createElementNS(ns, 'path');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    p.setAttribute('d', d); p.setAttribute('pathLength', '1');
    svg.append(p);
    return svg;
  }

  // Counts a tile number up from 0 once its tile has risen in.
  function countUp(node, target, suffix, delay) {
    if (calm || target <= 0) { node.textContent = target + suffix; return; }
    node.textContent = '0' + suffix;
    setTimeout(() => {
      const start = performance.now(), ms = 700;
      const tick = now => {
        const t = Math.min(1, (now - start) / ms), eased = 1 - Math.pow(1 - t, 3);
        node.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  }

  function render(r) {
    const passed = r.steps.filter(s => s.status === 'success').length;
    const fails = r.steps.filter(s => s.status === 'error').length;
    const warns = r.steps.filter(s => s.status === 'warning').length;
    const errs = fails + r.issues.filter(i => i.kind === 'err').length;
    const issueCount = fails + warns + r.issues.length;
    const tone = errs ? 'err' : issueCount || r.overall === 'attention' ? 'warn' : 'ok';

    const card = $('card');
    card.classList.add(tone);
    $('icon').append(tone === 'warn' ? el('b', null, '!') : svgIcon(tone === 'ok' ? PATH.ok : PATH.err));
    $('title').textContent = tone === 'ok' ? 'All clear' : tone === 'err' ? 'Something failed' : 'Needs a manual step';
    const when = r.at && !isNaN(Date.parse(r.at)) ? new Date(r.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown time';
    $('meta').textContent = 'Run on ' + when + (r.runTime ? ' · took ' + r.runTime : '') + (r.demo ? ' · demo run, no system changes' : '');
    document.title = 'Immortal · ' + $('title').textContent;

    const tiles = [
      ['STEPS', [passed, '/' + r.steps.length], fails ? fails + ' failed' : warns ? warns + ' need a manual step' : 'all passed', fails ? 'err' : warns ? 'warn' : 'ok'],
      ['ISSUES', [issueCount, ''], issueCount ? 'see below' : 'nothing failed', errs ? 'err' : issueCount ? 'warn' : 'ok'],
      ['NETWORK', r.net.kind || 'Unknown', [r.net.speed, r.net.kind === 'Ethernet' ? 'wired' : r.net.kind === 'Wi-Fi' ? 'wireless' : ''].filter(Boolean).join(' · ') || 'not reported', ''],
      ['RUN TIME', r.runTime || '—', r.runTime ? 'start to finish' : 'not measured', '']
    ];
    tiles.forEach(([label, value, note, t], i) => {
      const tile = el('div', 'tile ' + t), b = el('b');
      tile.style.setProperty('--i', i);
      if (Array.isArray(value)) countUp(b, value[0], value[1], 700 + i * 80); else b.textContent = value;
      tile.append(el('span', null, label), b, el('small', null, note));
      $('tiles').append(tile);
    });

    const MARK = { warning: '!', running: '…', pending: '·' };
    r.steps.forEach((s, i) => {
      const row = el('div', 'step ' + s.status), mark = el('i'), text = el('div');
      row.style.setProperty('--i', i);
      if (s.status === 'success' || s.status === 'error') mark.append(svgIcon(s.status === 'success' ? PATH.ok : PATH.err));
      else mark.textContent = MARK[s.status];
      text.append(el('strong', null, s.title), el('p', null, s.detail));
      row.append(mark, text);
      $('steps').append(row);
    });

    if (r.issues.length) {
      $('issues-wrap').hidden = false;
      r.issues.forEach((issue, i) => {
        const row = el('div', 'issue ' + issue.kind);
        row.style.setProperty('--i', r.steps.length + i);
        row.append(el('i', null, issue.kind === 'err' ? '✕' : '!'), el('p', null, issue.text));
        $('issues').append(row);
      });
    }
    card.hidden = false;
  }

  let report = null;
  try { report = sanitize(await decode(location.hash)); } catch { report = null; }
  if (report) render(report); else $('empty').hidden = false;
  addEventListener('hashchange', () => location.reload());
})();
