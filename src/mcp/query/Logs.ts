import { businessError, emit } from "./Support";
import { logRecordsForExperiment } from "./Experiments";

export async function queryLogs(id: string, lines?: number): Promise<number> {
  const records = await logRecordsForExperiment(id);
  if (!records) throw businessError(`experiment not found: ${id}`);
  emit(records.slice(Math.max(0, records.length - (lines === undefined ? Number.MAX_SAFE_INTEGER : lines))));
  return 0;
}
