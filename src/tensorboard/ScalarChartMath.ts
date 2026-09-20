export interface ChartSample {
  step: number;
  value: number;
}

/** TensorBoard-style debiased exponential moving average; the raw data is unchanged. */
export function smoothScalarValues(values: number[], weight: number): number[] {
  const amount = Math.max(0, Math.min(0.99, Number(weight) || 0));
  if (!amount) return values.slice();
  let last = 0;
  let count = 0;
  return values.map((value) => {
    if (!Number.isFinite(value)) return value;
    last = last * amount + (1 - amount) * value;
    count += 1;
    return last / (1 - Math.pow(amount, count));
  });
}

/** Ties use the earliest step, so marker positions stay stable during refresh. */
export function scalarExtreme(points: ChartSample[], direction: "max" | "min"): ChartSample | null {
  let best: ChartSample | null = null;
  for (const point of points) {
    if (!Number.isFinite(point.step) || !Number.isFinite(point.value)) continue;
    if (!best || (direction === "max" ? point.value > best.value : point.value < best.value)) best = point;
  }
  return best;
}

// Both functions are bundled into the browser page; the viewer makes no TensorBoard API call.
export const scalarChartMathScript = `const smoothScalarValues = ${smoothScalarValues.toString()};\nconst scalarExtreme = ${scalarExtreme.toString()};`;
