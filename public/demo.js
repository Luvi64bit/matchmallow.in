// Hero demo card: sample data only, no network calls.
// Score mirrors the real formula: points earned / points possible x 100.
const TIERS = [
  [90, 'Soulmate sparkle', 'You finish each other’s sentences. And snacks.', '#FF8AC0'],
  [75, 'Certified duo', 'Same energy, different playlists. It works.', '#B9A5FF'],
  [60, 'Opposites attract', 'One plans, one vibes. Perfectly balanced.', '#9BEBD0'],
  [45, 'Chaos couple', 'Never boring. Occasionally unhinged.', '#FFE36E'],
  [30, 'Situationship energy', 'Fun, but are you even something?', '#FF8AC0'],
  [0, 'Better as besties', 'Love you, just not like that.', '#B9A5FF'],
];
const WEIGHTS = { q1: 2, q2: 1, q3: 3 };
const MIA = { q1: 'a', q2: 'a', q3: 'a' };
const C = 314.16;

const card = document.getElementById('demo');
const $ = (id) => document.getElementById(id);
const prg = $('prg'), num = $('num'), name = $('tier-name'), desc = $('tier-desc'), live = $('live');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let shown = Number(num.textContent);
let raf = 0;

function score() {
  let earned = 0, total = 0;
  for (const q in WEIGHTS) {
    total += WEIGHTS[q];
    if (card.querySelector(`input[name="${q}"]:checked`)?.value === MIA[q]) earned += WEIGHTS[q];
  }
  return Math.round((earned / total) * 100);
}

function countTo(target) {
  cancelAnimationFrame(raf);
  if (reduce.matches) { num.textContent = shown = target; return; }
  const from = shown, start = performance.now(), dur = 800;
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    shown = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
    num.textContent = shown;
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

card.addEventListener('change', () => {
  const n = score();
  const [, title, line, color] = TIERS.find((t) => n >= t[0]);
  card.style.setProperty('--tier', color);
  name.textContent = title;
  desc.textContent = line;
  prg.style.strokeDashoffset = (C * (1 - n / 100)).toFixed(2);
  countTo(n);
  live.textContent = `Sample score ${n}%. ${title}. ${line}`;
});
