// Quiz flow for /start (make a vibe card) and /v/<slug> (answer one, or manage your own).
import { QUESTIONS, tierFor } from '/quiz-data.js';

const app = document.getElementById('app');
const stepCount = document.getElementById('step-count');
const mode = document.body.dataset.mode;
const slug = mode === 'answer' ? decodeURIComponent(location.pathname.split('/')[2] || '').toLowerCase() : '';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const C = 314.16;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const linkFor = (s) => `${location.origin}/v/${s}`;

// Cards this browser made: { slug: { token, nickname } }. The token lets you see matches and delete the link.
const mine = {
  all() { try { return JSON.parse(localStorage.getItem('mm:cards')) || {}; } catch { return {}; } },
  get(s) { return this.all()[s]; },
  set(s, v) { const a = this.all(); a[s] = v; localStorage.setItem('mm:cards', JSON.stringify(a)); },
  drop(s) { const a = this.all(); delete a[s]; localStorage.setItem('mm:cards', JSON.stringify(a)); },
};

async function api(path, opts = {}) {
  const res = await fetch(`/api/cards${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status });
  return data;
}

function show(html, steps = '') {
  stepCount.textContent = steps;
  app.innerHTML = `<section class="screen">${html}</section>`;
  const h = app.querySelector('h1, legend');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}

// ---------- Intro: nickname + age check ----------
function intro({ eyebrow, title, lede, button, onStart }) {
  const links = mode === 'create' ? Object.entries(mine.all()) : [];
  show(`
    <span class="eyebrow">${eyebrow}</span>
    <h1 class="title">${title}</h1>
    <p class="lede">${lede}</p>
    <form class="form sticker" novalidate>
      <div class="field">
        <label for="nick">Your nickname</label>
        <input id="nick" name="nick" maxlength="24" autocomplete="nickname" autocapitalize="words" required aria-describedby="nick-hint">
        <p class="hint" id="nick-hint">No real name needed. Up to 24 characters.</p>
      </div>
      <label class="check"><input type="checkbox" id="adult" required> I’m 18 or over.</label>
      <p class="err" id="err" role="alert" hidden></p>
      <button class="btn wide" type="submit">${button}</button>
    </form>
    ${links.length ? `<h2 class="section-h">Your links</h2><ul class="matches">${links.map(([s, v]) => `
      <li><span class="pct" style="background:var(--lilac)" aria-hidden="true">♥</span>
      <a class="nm" href="/v/${esc(s)}">${esc(v.nickname)}’s vibe card</a><span class="tn">See who answered</span></li>`).join('')}</ul>` : ''}
  `);
  const form = app.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nick = form.querySelector('#nick'), adult = form.querySelector('#adult');
    const nickname = nick.value.replace(/\s+/g, ' ').trim();
    const err = form.querySelector('#err');
    const msg = !nickname ? 'Pick a nickname first.' : !adult.checked ? 'Please confirm you’re 18 or over.' : '';
    err.hidden = !msg;
    err.textContent = msg;
    if (msg) { (nickname ? adult : nick).focus(); return; }
    onStart(nickname);
  });
}

// ---------- Questions, one at a time ----------
function runQuiz(nickname, onDone, doneLabel) {
  const answers = {};
  let i = 0, pointer = 0;

  const render = () => {
    const q = QUESTIONS[i];
    const last = i === QUESTIONS.length - 1;
    show(`
      <div class="bar" aria-hidden="true"><i style="--p:${(i / QUESTIONS.length) * 100}%"></i></div>
      <form novalidate>
        <fieldset class="q">
          <legend>${esc(q.q)}<span class="weight">Question ${i + 1} of ${QUESTIONS.length}${q.weight === 3 ? ' · this one counts extra' : ''}</span></legend>
          <div class="opts">${Object.entries(q.opts).map(([v, label]) => `
            <label class="opt"><input type="radio" name="a" value="${v}"${answers[q.id] === v ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('')}
          </div>
        </fieldset>
        <p class="err" id="err" role="alert" hidden></p>
        <div class="q-nav">
          ${i ? '<button class="link-btn" type="button" id="back">← Back</button>' : '<span></span>'}
          <button class="btn" type="submit" id="next"${answers[q.id] ? '' : ' disabled'}>${last ? doneLabel : 'Next'}</button>
        </div>
      </form>
    `, `${i + 1} / ${QUESTIONS.length}`);

    const form = app.querySelector('form');
    const next = form.querySelector('#next');
    form.addEventListener('pointerdown', () => { pointer = Date.now(); });
    form.addEventListener('change', (e) => {
      answers[q.id] = e.target.value;
      next.disabled = false;
      // Tapping an answer moves on by itself; arrow keys just select.
      if (!last && Date.now() - pointer < 1000) setTimeout(go, reduce.matches ? 0 : 220);
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); if (answers[q.id]) go(); });
    form.querySelector('#back')?.addEventListener('click', () => { i--; render(); });

    async function go() {
      if (!last) { i++; render(); return; }
      next.disabled = true;
      next.textContent = 'One sec…';
      try {
        await onDone(nickname, answers);
      } catch (err) {
        const box = form.querySelector('#err');
        box.textContent = err.message;
        box.hidden = false;
        next.disabled = false;
        next.textContent = doneLabel;
      }
    }
  };
  render();
}

// ---------- Creator: link + who answered ----------
async function owner(s, nickname) {
  const url = linkFor(s);
  const canShare = typeof navigator.share === 'function';
  show(`
    <span class="eyebrow">Your link is ready</span>
    <h1 class="title">Send it to your person</h1>
    <p class="lede">When they answer, you both see the score and three highlights. Nobody sees anyone’s actual answers.</p>
    <div class="vibe-card">
      <p class="who"><i class="dot" aria-hidden="true"></i>${esc(nickname)}’s vibe card</p>
      <a class="url-box" href="${esc(url)}">${esc(url.replace(/^https?:\/\//, ''))}</a>
      <div class="share-row">
        ${canShare ? '<button class="btn" type="button" id="share">Share link</button>' : ''}
        <button class="btn ${canShare ? 'alt' : ''}" type="button" id="copy">Copy link</button>
      </div>
      <p class="toast" id="toast" role="status"></p>
    </div>
    <h2 class="section-h">Who answered</h2>
    <div id="list"><p class="empty">Checking…</p></div>
    <div class="after">
      <button class="link-btn" type="button" id="refresh">Refresh</button>
      <button class="link-btn danger" type="button" id="del">Delete this link</button>
    </div>
  `);
  const toast = app.querySelector('#toast');
  const text = `Do we vibe? Answer my Matchmallow vibe card: ${url}`;
  app.querySelector('#share')?.addEventListener('click', () => navigator.share({ title: 'Do we vibe?', text: 'Answer my Matchmallow vibe card 💌', url }).catch(() => {}));
  app.querySelector('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text); toast.textContent = 'Copied! Paste it in your chat.'; }
    catch { toast.textContent = 'Couldn’t copy. Press and hold the link to copy it.'; }
  });
  app.querySelector('#refresh').addEventListener('click', load);
  app.querySelector('#del').addEventListener('click', async () => {
    if (!confirm('Delete this link? Nobody will be able to open or answer it, and its matches are removed too.')) return;
    try {
      await api(`/${s}`, { method: 'DELETE', headers: { Authorization: `Bearer ${mine.get(s).token}` } });
      mine.drop(s);
      show(`<span class="eyebrow">Deleted</span><h1 class="title">Your link is gone</h1>
        <p class="lede">Nobody can open or answer it anymore.</p>
        <div class="after"><a class="btn" href="/start">Make a new vibe card</a></div>`);
    } catch (err) { toast.textContent = err.message; }
  });

  async function load() {
    const list = app.querySelector('#list');
    try {
      const { matches } = await api(`/${s}/matches`, { headers: { Authorization: `Bearer ${mine.get(s).token}` } });
      list.innerHTML = matches.length
        ? `<ul class="matches">${matches.map((m) => {
            const [, tier, , color] = tierFor(m.score);
            return `<li><span class="pct" style="background:${color}">${m.score}%</span>
              <span class="nm">${esc(m.nickname)}</span><span class="tn">${esc(tier)}</span>
              <ul>${m.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></li>`;
          }).join('')}</ul>`
        : '<p class="empty">Nobody yet. Send your link, then check back here.</p>';
    } catch (err) {
      if (err.status === 403 || err.status === 404) { mine.drop(s); }
      list.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    }
  }
  load();
}

// ---------- Answerer: result card ----------
function result({ creator, nickname, score, highlights }) {
  const [, tier, line, color] = tierFor(score);
  show(`
    <span class="eyebrow">Your match</span>
    <h1 class="title">You and ${esc(creator)}</h1>
    <div class="result-card" style="--tier:${color}">
      <p class="pair"><span><i class="dot a" aria-hidden="true"></i>${esc(creator)}</span><span aria-hidden="true">+</span><span><i class="dot b" aria-hidden="true"></i>${esc(nickname)}</span></p>
      <div class="res-main">
        <div class="ring" aria-hidden="true">
          <svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="50"/><circle class="prg" cx="60" cy="60" r="50"/></svg>
          <span class="num"><span id="num">0</span><small>%</small></span>
        </div>
        <div><p class="tier-name">${esc(tier)}</p><p class="tier-desc">${esc(line)}</p></div>
      </div>
      <p class="sr-only">Score ${score}%. ${esc(tier)}. ${esc(line)}</p>
      <ul class="hl">${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    </div>
    <p class="privacy-note" style="margin-top:24px">${esc(creator)} can see this score and highlights too. Your answers stay private.</p>
    <div class="after">
      <a class="btn" href="/start">Make my own vibe card</a>
      <a class="link-btn" href="/">What is Matchmallow?</a>
    </div>
  `);
  const prg = app.querySelector('.prg'), num = app.querySelector('#num');
  requestAnimationFrame(() => requestAnimationFrame(() => { prg.style.strokeDashoffset = (C * (1 - score / 100)).toFixed(2); }));
  if (reduce.matches) { num.textContent = score; return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 1100);
    num.textContent = Math.round(score * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function notFound(message) {
  show(`<span class="eyebrow">Hmm</span><h1 class="title">This link isn’t here</h1>
    <p class="lede">${esc(message)} Ask whoever sent it for a fresh one, or make your own.</p>
    <div class="after"><a class="btn" href="/start">Make my vibe card</a></div>`);
}

// ---------- Boot ----------
async function boot() {
  if (mode === 'create') {
    intro({
      eyebrow: '10 questions · 2 minutes',
      title: 'Make your vibe card',
      lede: 'Answer 10 quick questions about how you love, text and plan your weekends. Then send your link to your crush, partner or bestie.',
      button: 'Start the quiz',
      onStart: (nick) => runQuiz(nick, async (nickname, answers) => {
        const card = await api('', { method: 'POST', body: JSON.stringify({ nickname, answers, adult: true }) });
        mine.set(card.slug, { token: card.token, nickname: card.nickname });
        history.replaceState(null, '', `/v/${card.slug}`);
        owner(card.slug, card.nickname);
      }, 'Get my link'),
    });
    return;
  }

  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return notFound('That link looks incomplete.');
  const own = mine.get(slug);
  if (own) return owner(slug, own.nickname);

  show('<p class="lede">Loading the vibe card…</p>');
  let card;
  try { card = await api(`/${slug}`); }
  catch (err) { return err.status === 404 ? notFound('It may have been deleted.') : notFound(err.message); }

  intro({
    eyebrow: 'You got a vibe card',
    title: `${esc(card.nickname)} wants to know if you vibe`,
    lede: 'Answer the same 10 questions. You’ll both see the score and three highlights, never each other’s answers.',
    button: 'Start the quiz',
    onStart: (nick) => runQuiz(nick, async (nickname, answers) => {
      result(await api(`/${slug}/matches`, { method: 'POST', body: JSON.stringify({ nickname, answers, adult: true }) }));
    }, 'See our match'),
  });
}

boot();
