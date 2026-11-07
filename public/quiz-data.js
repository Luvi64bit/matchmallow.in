// The 10 Matchmallow questions. Shared by the quiz pages and the scoring function.
// weight: 1 to 3 (love language and conflict style count most).
// pairs: complementary answers that earn half points.
// lines: highlight copy for [same answer, complementary pair, different answer].
// Highlights describe the topic, never the actual answers, so answers stay private.
export const QUESTIONS = [
  {
    id: 'friday', weight: 1, q: 'Ideal Friday night',
    opts: { movie: 'Cozy movie', drive: 'Night drive', group: 'Big group hangout', sleep: 'Asleep by 10' },
    pairs: [['movie', 'sleep'], ['drive', 'group']],
    lines: ['Same Friday night plans. Easy.', 'Your Fridays fit together nicely.', 'Your Friday nights will never be boring.'],
  },
  {
    id: 'texting', weight: 1, q: 'Texting style',
    opts: { instant: 'Instant reply', voice: 'Voice notes', memes: 'Memes only', slow: 'Three business days' },
    pairs: [['instant', 'voice'], ['memes', 'slow']],
    lines: ['You text the exact same way.', 'Your texting styles click.', 'Different texting speeds. Patience is romantic.'],
  },
  {
    id: 'love', weight: 3, q: 'Your love language',
    opts: { words: 'Sweet words', time: 'Quality time', gifts: 'Little gifts', acts: 'Doing things for you', touch: 'Hugs and hand-holding' },
    pairs: [['time', 'touch'], ['gifts', 'acts'], ['words', 'time']],
    lines: ['You speak the same love language.', 'Your love languages go together.', 'You show love in different ways. Learn each other’s.'],
  },
  {
    id: 'fight', weight: 3, q: 'How you handle a fight',
    opts: { talk: 'Talk it out', cool: 'Cool off first', write: 'Write it down', joke: 'Joke it away' },
    pairs: [['talk', 'write'], ['cool', 'write']],
    lines: ['You make up the same way.', 'Your conflict styles balance out.', 'You argue differently. Agree on a time-out word.'],
  },
  {
    id: 'weekend', weight: 2, q: 'Weekend plans',
    opts: { planner: 'Planned to the minute', spont: 'Totally spontaneous', mix: 'One plan, then vibes', nothing: 'Doing nothing, proudly' },
    pairs: [['planner', 'spont'], ['mix', 'nothing']],
    lines: ['Same weekend energy.', 'One plans, one vibes. Perfectly balanced.', 'Your weekends need a little negotiating.'],
  },
  {
    id: 'trip', weight: 1, q: 'Dream trip',
    opts: { beach: 'Beach and naps', hills: 'Mountains and hikes', city: 'City and food', home: 'Staycation' },
    pairs: [['beach', 'home'], ['hills', 'city']],
    lines: ['You already agree on the next trip.', 'Your dream trips mix well.', 'Your travel bucket lists are wildly different.'],
  },
  {
    id: 'money', weight: 2, q: 'With money, you are…',
    opts: { saver: 'A saver', spender: 'A spender', treat: 'Saver who treats myself', chaos: 'What’s a budget?' },
    pairs: [['saver', 'spender'], ['treat', 'saver']],
    lines: ['You handle money the same way.', 'Your money habits balance each other.', 'Money talks might get spicy.'],
  },
  {
    id: 'social', weight: 2, q: 'Social battery',
    opts: { party: 'Party starter', small: 'Small group only', home: 'Homebody', depends: 'Depends on the day' },
    pairs: [['small', 'depends'], ['party', 'depends']],
    lines: ['Your social batteries match.', 'Your social batteries recharge together.', 'One of you will be leaving the party early.'],
  },
  {
    id: 'food', weight: 1, q: 'Date night food',
    opts: { cook: 'Cook together', order: 'Order in', new: 'Try a new place', usual: 'Our usual spot' },
    pairs: [['cook', 'order'], ['new', 'usual']],
    lines: ['Same food mood. Dinner is sorted.', 'Your food moods pair well.', 'Choosing dinner could take a while.'],
  },
  {
    id: 'clock', weight: 1, q: 'Morning or night?',
    opts: { early: 'Early bird', night: 'Night owl', snooze: 'Snooze five times', any: 'Whenever, honestly' },
    pairs: [['early', 'any'], ['night', 'snooze']],
    lines: ['Your body clocks are in sync.', 'Your schedules overlap just right.', 'Good morning texts meet goodnight texts.'],
  },
];

export const TIERS = [
  [90, 'Soulmate sparkle', 'You finish each other’s sentences. And snacks.', '#FF8AC0'],
  [75, 'Certified duo', 'Same energy, different playlists. It works.', '#B9A5FF'],
  [60, 'Opposites attract', 'One plans, one vibes. Perfectly balanced.', '#9BEBD0'],
  [45, 'Chaos couple', 'Never boring. Occasionally unhinged.', '#FFE36E'],
  [30, 'Situationship energy', 'Fun, but are you even something?', '#FF8AC0'],
  [0, 'Better as besties', 'Love you, just not like that.', '#B9A5FF'],
];

export const tierFor = (score) => TIERS.find((t) => score >= t[0]);

// Returns null if answers are missing or invalid.
export function cleanAnswers(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const q of QUESTIONS) {
    const a = input[q.id];
    if (typeof a !== 'string' || !Object.hasOwn(q.opts, a)) return null;
    out[q.id] = a;
  }
  return out;
}

// Same answer = full points, complementary pair = half, otherwise nothing.
// Score = points earned / points possible x 100. Picks three highlights.
export function scoreMatch(a, b) {
  let earned = 0, total = 0;
  const same = [], half = [], diff = [];
  for (const q of QUESTIONS) {
    total += q.weight;
    const x = a[q.id], y = b[q.id];
    if (x === y) { earned += q.weight; same.push(q); }
    else if (q.pairs.some(([p, r]) => (p === x && r === y) || (p === y && r === x))) { earned += q.weight / 2; half.push(q); }
    else diff.push(q);
  }
  const byWeight = (l) => l.sort((m, n) => n.weight - m.weight);
  const picks = [
    ...byWeight(same).map((q) => q.lines[0]),
    ...byWeight(half).map((q) => q.lines[1]),
    ...byWeight(diff).map((q) => q.lines[2]),
  ];
  // Always show at least one "different" line when there is one, to keep it honest.
  const highlights = picks.slice(0, 3);
  if (diff.length && same.length + half.length >= 3) highlights[2] = diff[0].lines[2];
  return { score: Math.round((earned / total) * 100), highlights };
}
