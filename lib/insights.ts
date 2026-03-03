export function getInsightTeaser(step: number, answers: Record<string, unknown>): string {
  if (step === 2) {
    const values = Object.values(answers).map((v) => Number(v));
    const avg =
      values.length > 0
        ? values.reduce((sum, n) => sum + n, 0) / values.length
        : 0;

    if (avg >= 4) {
      return 'You show strong alignment in this section. Let’s continue.';
    }

    if (avg >= 3) {
      return 'Your responses show balanced patterns so far.';
    }

    return 'Interesting variability detected. The full profile will provide more insight.';
  }

  if (step === 3) {
    const hasCollaborative = Object.values(answers).includes('B');

    return hasCollaborative
      ? 'You tend to consider collaborative dynamics in decision making.'
      : 'You appear comfortable making decisive, action-oriented choices.';
  }

  if (step === 4) {
    return 'Consistency patterns are being evaluated. Final insights will appear in your report.';
  }

  return 'Progress saved successfully.';
}
