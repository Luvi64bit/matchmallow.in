// Shared, pure scoring utilities for the future 10-question flow.
// The question bank and complementary answer pairs must be supplied separately.
export const TIERS = Object.freeze([
  { min: 90, name: 'Soulmate sparkle' },
  { min: 75, name: 'Certified duo' },
  { min: 60, name: 'Opposites attract' },
  { min: 45, name: 'Chaos couple' },
  { min: 30, name: 'Situationship energy' },
  { min: 0, name: 'Better as besties' },
]);

export function tierFor(score) {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new RangeError('Score must be an integer between 0 and 100');
  }
  return TIERS.find(tier => score >= tier.min);
}

// questions: [{ id, weight, options: ['a', 'b'], complementaryPairs?: [['a','b']] }]
// answers are objects keyed by question ID. Incomplete submissions are rejected.
export function calculateMatch(questions, creatorAnswers, recipientAnswers) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new TypeError('A non-empty question bank is required');
  }
  if (!creatorAnswers || !recipientAnswers || typeof creatorAnswers !== 'object' || typeof recipientAnswers !== 'object') {
    throw new TypeError('Both answer sets are required');
  }
  const seen = new Set();
  let earned = 0;
  let possible = 0;
  for (const q of questions) {
    if (!q || typeof q.id !== 'string' || !q.id || seen.has(q.id)) {
      throw new TypeError('Question IDs must be unique non-empty strings');
    }
    seen.add(q.id);
    if (!Number.isInteger(q.weight) || q.weight < 1 || q.weight > 3 ||
        !Array.isArray(q.options) || q.options.length < 2 ||
        new Set(q.options).size !== q.options.length ||
        q.options.some(option => typeof option !== 'string' || !option)) {
      throw new TypeError('Each question needs weight 1–3 and unique answer options');
    }
    const a = creatorAnswers[q.id], b = recipientAnswers[q.id];
    if (!q.options.includes(a) || !q.options.includes(b)) {
      throw new RangeError('Both people must answer every question using a valid option');
    }
    const pairs = q.complementaryPairs ?? [];
    if (!Array.isArray(pairs) || pairs.some(pair =>
      !Array.isArray(pair) || pair.length !== 2 ||
      pair[0] === pair[1] || !q.options.includes(pair[0]) || !q.options.includes(pair[1]))) {
      throw new TypeError('Complementary pairs must contain two different valid options');
    }
    const complementary = pairs.some(([x,y]) => (a === x && b === y) || (a === y && b === x));
    earned += q.weight * (a === b ? 1 : complementary ? 0.5 : 0);
    possible += q.weight;
  }
  const percent = Math.round(100 * earned / possible);
  return { percent, earned, possible, tier: tierFor(percent).name };
}
