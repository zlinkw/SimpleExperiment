export function observeStateRenderProgress(postedSeq: number, renderedSeq: number, consecutiveStalledAcks: number, threshold = 3): { consecutiveStalledAcks: number; unhealthy: boolean } {
  if (postedSeq <= renderedSeq) return { consecutiveStalledAcks: 0, unhealthy: false };
  const next = Math.max(0, consecutiveStalledAcks) + 1;
  return { consecutiveStalledAcks: next, unhealthy: next >= Math.max(1, threshold) };
}
