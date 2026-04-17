export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number | null {
  const mean = average(values);

  if (mean === null || values.length < 2) {
    return null;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return (current - previous) / previous;
}

export function linearSlope(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const xs = values.map((_, index) => index);
  const meanX = average(xs);
  const meanY = average(values);

  if (meanX === null || meanY === null) {
    return null;
  }

  const numerator = xs.reduce((sum, x, index) => sum + (x - meanX) * (values[index] - meanY), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}
