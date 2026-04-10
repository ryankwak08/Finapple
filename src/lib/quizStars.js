export function getQuizPassThreshold(total = 5) {
  const normalizedTotal = Math.max(1, Number(total) || 0);
  return Math.min(3, normalizedTotal);
}

export function getQuizStarCount(score, total = 5) {
  const normalizedScore = Number(score) || 0;
  const normalizedTotal = Math.max(1, Number(total) || 0);
  const passThreshold = getQuizPassThreshold(normalizedTotal);

  if (normalizedScore < passThreshold) {
    return 0;
  }

  if (normalizedScore >= normalizedTotal) {
    return 3;
  }

  const nearPerfectThreshold = Math.max(passThreshold + 1, normalizedTotal - 1);
  return normalizedScore >= nearPerfectThreshold ? 2 : 1;
}
