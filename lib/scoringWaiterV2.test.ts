import test from 'node:test';
import assert from 'node:assert/strict';

import { WAITER_ITEM_BANK_V1 } from './itemBank/waiter.ts';
import { scoreWaiterV2 } from './scoringWaiterV2.ts';

function buildAnswers(overrides: Record<string, unknown> = {}) {
  const answers: Record<string, unknown> = {};

  for (const item of WAITER_ITEM_BANK_V1) {
    if (item.type === 'likert') {
      answers[item.question_id] = 5;
      continue;
    }

    if (item.type === 'sjt') {
      answers[item.question_id] = 'A';
      continue;
    }

    if (item.type === 'tradeoff') {
      answers[item.question_id] = 'A';
      continue;
    }

    if (item.type === 'validity') {
      answers[item.question_id] = 1;
    }
  }

  return { ...answers, ...overrides };
}

test('scoreWaiterV2: high-quality answers produce high overall fit and no validity flags', () => {
  const answers = buildAnswers();
  const result = scoreWaiterV2(answers);

  assert.equal(result.profile_id, 'waiter_service_v1');
  assert.equal(result.validity.flags.length, 0);
  assert.ok(result.overall_fit >= 70, `Expected overall_fit >= 70, got ${result.overall_fit}`);
  assert.equal(result.validity.integrity_index, result.competencies.integrity);
});

test('scoreWaiterV2: validity answers at threshold trigger both flags and penalties', () => {
  const answers = buildAnswers({ validity_w_1: 5, validity_w_2: 5 });
  const result = scoreWaiterV2(answers);

  assert.ok(result.validity.flags.includes('impression_management'));
  assert.ok(result.validity.flags.includes('unrealistic_self_presentation'));

  const noPenalty = scoreWaiterV2(buildAnswers());
  assert.equal(result.validity.integrity_index, Math.max(0, noPenalty.competencies.integrity - 20));
});

test('scoreWaiterV2: competencies are bounded and HR bullets are capped', () => {
  const result = scoreWaiterV2(buildAnswers());

  const competencyValues = Object.values(result.competencies);
  assert.equal(competencyValues.length, 6);

  for (const score of competencyValues) {
    assert.ok(score >= 0 && score <= 100, `Competency score out of range: ${score}`);
  }

  assert.ok(result.overall_fit >= 0 && result.overall_fit <= 100);
  assert.ok(result.why_hr_el.length <= 5);
});
