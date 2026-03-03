import { WAITER_ITEM_BANK_V1 } from '@/lib/itemBank';

export function generateWaiterV2RandomAnswers() {
  const answers: Record<string, string | number> = {};

  for (const item of WAITER_ITEM_BANK_V1) {
    if (item.type === 'likert') {
      answers[item.question_id] = randomInt(3, 5);
      continue;
    }

    if (item.type === 'tradeoff') {
      answers[item.question_id] = Math.random() < 0.5 ? 'A' : 'B';
      continue;
    }

    if (item.type === 'sjt') {
      const options: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
      answers[item.question_id] = options[randomInt(0, options.length - 1)];
      continue;
    }

    if (item.type === 'validity') {
      answers[item.question_id] = randomInt(1, 3);
    }
  }

  return answers;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
