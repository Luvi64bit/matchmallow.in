import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatch, tierFor } from '../public/scoring.mjs';

const questions = [
  { id: 'plans', weight: 2, options: ['planner', 'spontaneous', 'home'], complementaryPairs: [['planner','spontaneous']] },
  { id: 'texts', weight: 1, options: ['fast', 'slow'] },
  { id: 'conflict', weight: 3, options: ['talk', 'space'] },
];
test('identical answers yield 100%', () => {
  const a = { plans: 'planner', texts: 'fast', conflict: 'talk' };
  assert.equal(calculateMatch(questions, a, a).percent, 100);
});
test('different non-complementary answers yield 0%', () => {
  assert.equal(calculateMatch(questions,
    { plans: 'planner', texts: 'fast', conflict: 'talk' },
    { plans: 'home', texts: 'slow', conflict: 'space' }).percent, 0);
});
test('complementary pairs earn half credit regardless of order', () => {
  const a = { plans: 'planner', texts: 'fast', conflict: 'talk' };
  const b = { plans: 'spontaneous', texts: 'slow', conflict: 'space' };
  assert.deepEqual(calculateMatch(questions, a, b), calculateMatch(questions, b, a));
  assert.equal(calculateMatch(questions, a, b).percent, 17);
});
test('rounding is integer and tiers follow documented boundaries', () => {
  for (const [n,tier] of [[0,'Better as besties'],[29,'Better as besties'],[30,'Situationship energy'],[44,'Situationship energy'],[45,'Chaos couple'],[59,'Chaos couple'],[60,'Opposites attract'],[74,'Opposites attract'],[75,'Certified duo'],[89,'Certified duo'],[90,'Soulmate sparkle'],[100,'Soulmate sparkle']]) {
    assert.equal(tierFor(n).name, tier);
  }
});
test('rejects missing and invalid answers', () => {
  assert.throws(() => calculateMatch(questions, {}, {}), RangeError);
  assert.throws(() => calculateMatch(questions,
    { plans: 'other', texts: 'fast', conflict: 'talk' },
    { plans: 'planner', texts: 'slow', conflict: 'space' }), RangeError);
});
test('rejects duplicate questions and malformed pairs', () => {
  assert.throws(() => calculateMatch([questions[0],questions[0]], {}, {}), TypeError);
  assert.throws(() => calculateMatch([{...questions[0], complementaryPairs: [['planner','invalid']]}],
    {plans:'planner'}, {plans:'planner'}), TypeError);
});
