import * as fs from "fs";
import * as path from "path";

export type SeedRecord = { planFile: string; workerId: string; case: string; seed: string; method: string; dataset: string; rate: string; endpoint: string; metrics: Record<string, number> };
export type DerivedMetric = { metric: string; leftEndpoint: string; rightEndpoint: string; outputName: string; scale: number };
export type TableRegistry = { schemaVersion: 1; plans: Record<string, { revision: string; expectedSeeds: number; records: SeedRecord[] }>; derivedMetric?: DerivedMetric };
export const emptyTableRegistry = (): TableRegistry => ({ schemaVersion: 1, plans: {} });

export function summaryMatchesPlanRevision(summary: any, plan: any): boolean {
  const current = String(plan?.revision || "").trim();
  const reported = String(summary?.planRevision || "").trim();
  return !current || !reported || current === reported;
}

export function safeTableName(value: string): string {
  const token = String(value || "").trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+|\.+$/g, "").slice(0, 80);
  if (!token || token === "." || token === "..") throw new Error("结果名称不能映射到安全文件夹。");
  return token;
}
export function methodTableName(value: string): string {
  const name = safeTableName(value);
  return name === "final" ? "_method_final" : name;
}

export function methodForSummary(summary: any, planFile: string): string {
  const names = new Set<string>();
  for (const row of Array.isArray(summary?.results) ? summary.results : []) {
    const name = String(row?.dimensions?.method || row?.method || "").trim();
    if (name) names.add(name);
  }
  if (names.size > 1) throw new Error("当前 Plan 包含多个方法，请分别配置方法结果路径：" + [...names].join("、"));
  return methodTableName([...names][0] || path.posix.basename(planFile, path.posix.extname(planFile)));
}

function ratePercent(dims: any): string {
  if (dims.rate_percent !== undefined && dims.rate_percent !== null && String(dims.rate_percent).trim()) return String(dims.rate_percent).trim();
  if (dims.train_rate === undefined || dims.train_rate === null || String(dims.train_rate).trim() === "") return "";
  const n = Number(dims.train_rate);
  return Number.isFinite(n) ? String(Number((n * (Math.abs(n) <= 1 ? 100 : 1)).toPrecision(12))) : String(dims.train_rate).trim();
}

export function recordsForSummary(summary: any, planFile: string): SeedRecord[] {
  if (!summary || String(summary.planFile || "").replace(/\\/g, "/") !== planFile.replace(/\\/g, "/")) throw new Error("结果摘要与所选 Plan 不匹配。");
  if (summary.incompleteAggregate || (Array.isArray(summary.unavailableWorkerIds) && summary.unavailableWorkerIds.length)) throw new Error("部分 Worker 离线，暂不覆盖总表。");
  const tables = Array.isArray(summary.workerResultTables) ? summary.workerResultTables : [];
  if (tables.some((row: any) => row.aggregateStatus && row.aggregateStatus !== "ready")) throw new Error("部分 Worker 的当前 Plan 汇总未就绪。");
  const sources = new Map<string, string>();
  for (const row of tables) sources.set(String(row.workerId || "").toLowerCase(), String(row.rawResultCsvPath || ""));
  const records: SeedRecord[] = [];
  for (const row of Array.isArray(summary.results) ? summary.results : []) {
    const workerId = String(row?.workerId || row?.resultOwnerWorkerId || summary.resultOwnerWorkerId || "").trim();
    const declared = sources.get(workerId.toLowerCase()) || String(summary.rawResultCsvPath || "");
    if (!declared || String(row?.sourceFiles?.[0]?.path || "") !== declared) continue;
    const dims = row?.dimensions || {};
    const caseName = String(dims.case || "").trim();
    const seed = String(dims.seed ?? "").trim();
    if (!caseName || !seed) throw new Error("原始结果缺少可信 case 或 seed，请先设置列映射。");
    const metrics: Record<string, number> = {};
    for (const [name, payload] of Object.entries(row?.metrics || {})) {
      const raw = (payload as any)?.value ?? payload;
      if (raw === "" || raw === null || raw === undefined) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) metrics[name] = value;
    }
    if (!Object.keys(metrics).length) continue;
    records.push({ planFile, workerId, case: caseName, seed, method: String(dims.method || row.method || "").trim() || path.posix.basename(planFile, path.posix.extname(planFile)), dataset: String(dims.dataset || "").trim(), rate: ratePercent(dims), endpoint: String(dims.eval_protocol || dims.split || "").trim(), metrics });
  }
  if (!records.length) throw new Error("当前 Plan 没有可核对的逐 seed 原始记录。");
  return records;
}

export function updateRegistry(registry: TableRegistry, summary: any, planFile: string, expectedSeeds = 0): TableRegistry {
  const records = recordsForSummary(summary, planFile);
  return { schemaVersion: 1, plans: { ...(registry?.plans || {}), [planFile]: { revision: String(summary.planRevision || ""), expectedSeeds: Math.max(0, Math.floor(expectedSeeds)), records } } };
}

export function summaryForWorker(summary: any, workerId: string): any | undefined {
  const id = String(workerId || "").toLowerCase();
  const tables = (Array.isArray(summary?.workerResultTables) ? summary.workerResultTables : []).filter((row: any) => String(row?.workerId || "").toLowerCase() === id && row?.aggregateStatus === "ready" && String(row?.rawResultCsvPath || "").trim());
  const results = (Array.isArray(summary?.results) ? summary.results : []).filter((row: any) => String(row?.workerId || row?.resultOwnerWorkerId || "").toLowerCase() === id);
  if (!tables.length || !results.length) return undefined;
  return { ...summary, workerResultTables: tables, results, availableWorkerIds: [workerId], unavailableWorkerIds: [], incompleteAggregate: false, resultOwnerWorkerId: workerId };
}

export function mergeAvailableWorkerResults(registry: TableRegistry, summary: any, planFile: string, expectedSeeds = 0): TableRegistry {
  const tables = Array.isArray(summary?.workerResultTables) ? summary.workerResultTables : [];
  const ready = tables.filter((table: any) => table?.aggregateStatus === "ready" && String(table.rawResultCsvPath || "").trim());
  const owners = new Set(ready.map((table: any) => String(table.workerId || "").toLowerCase()));
  const rows = (Array.isArray(summary?.results) ? summary.results : []).filter((row: any) => owners.has(String(row?.workerId || row?.resultOwnerWorkerId || "").toLowerCase()));
  if (!rows.length) return registry;
  const partial = { ...summary, workerResultTables: ready, results: rows, unavailableWorkerIds: [], incompleteAggregate: false };
  const incoming = recordsForSummary(partial, planFile);
  const replaced = new Set(incoming.map((record) => record.workerId.toLowerCase()));
  const previous = registry.plans?.[planFile];
  const revision = String(summary.planRevision || "");
  const sameRevision = !previous?.revision || !revision || previous.revision === revision;
  const retained = sameRevision ? (previous?.records || []).filter((record) => !replaced.has(record.workerId.toLowerCase())) : [];
  return { schemaVersion: 1, plans: { ...(registry?.plans || {}), [planFile]: {
    revision: revision || previous?.revision || "",
    expectedSeeds: Math.max(0, Math.floor(expectedSeeds || previous?.expectedSeeds || 0)),
    records: [...retained, ...incoming],
  } } };
}

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function writeCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
export function readCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') { if (cell) throw new Error("CSV 引号格式无效。"); quoted = true; }
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (quoted) throw new Error("CSV 末尾引号未闭合。");
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [header = [], ...data] = rows;
  if (!header.length || new Set(header).size !== header.length || data.some((item) => item.length !== header.length)) throw new Error("CSV 表头或列数无效。");
  return { header, rows: data };
}

export type ResultTable = { header: string[]; rows: (string | number)[][]; markdown: string };
export function buildTables(registry: TableRegistry): Record<string, ResultTable> {
  type Group = { record: SeedRecord; expected: number; seeds: Map<string, Record<string, number>>; derived?: number[] };
  const grouped = new Map<string, Group>();
  for (const plan of Object.values(registry.plans || {})) for (const record of plan.records) {
    const identity = JSON.stringify([record.method, record.dataset, record.rate, record.endpoint, record.case]);
    const group = grouped.get(identity) || { record, expected: 0, seeds: new Map() };
    group.expected = Math.max(group.expected, plan.expectedSeeds);
    const values = group.seeds.get(record.seed) || {};
    for (const [name, value] of Object.entries(record.metrics)) {
      if (values[name] !== undefined && values[name] !== value) throw new Error("重复 seed 的指标冲突：" + record.method + "/" + record.case + "/" + record.seed + "/" + name);
      values[name] = value;
    }
    group.seeds.set(record.seed, values);
    grouped.set(identity, group);
  }
  const groups = [...grouped.values()];
  const derived = registry.derivedMetric;
  if (derived && derived.metric && derived.leftEndpoint && derived.rightEndpoint && derived.outputName) {
    if (![1, 100].includes(Number(derived.scale)) || !/^[A-Za-z][A-Za-z0-9_]*$/.test(derived.outputName)) throw new Error("派生指标配置无效。");
    for (const group of groups) {
      const base = group.record;
      const key = (endpoint: string) => JSON.stringify([base.method, base.dataset, base.rate, endpoint, base.case]);
      const left = grouped.get(key(derived.leftEndpoint));
      const right = grouped.get(key(derived.rightEndpoint));
      if (!left || !right) continue;
      const values: number[] = [];
      for (const [seed, metrics] of left.seeds) {
        const other = right.seeds.get(seed);
        if (other && Number.isFinite(metrics[derived.metric]) && Number.isFinite(other[derived.metric]))
          values.push((metrics[derived.metric] - other[derived.metric]) * Number(derived.scale));
      }
      group.derived = values;
    }
  }
  const methodNames = new Map<string, string>();
  for (const group of groups) {
    const token = methodTableName(group.record.method);
    const previous = methodNames.get(token);
    if (previous && previous !== group.record.method) throw new Error("不同方法映射到同一文件夹：" + previous + "、" + group.record.method);
    methodNames.set(token, group.record.method);
  }
  const shortKeys = groups.map((group) => JSON.stringify([group.record.method, group.record.dataset, group.record.rate, group.record.endpoint]));
  const showCase = new Set(shortKeys).size !== shortKeys.length;
  const make = (chosen: Group[]): ResultTable => {
    const metrics = [...new Set(chosen.flatMap((group) => [...group.seeds.values()].flatMap((seed) => Object.keys(seed))))].sort();
    const label = (name: string) => {
      const preferred: Record<string, string> = { AUC: "roc_auc", AUPRC: "auprc", F1: "f1_score", ECE: "ece", brier: "brier_score" };
      return (preferred[name] || name).replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "metric";
    };
    const labels = metrics.map(label);
    if (new Set(labels).size !== labels.length) throw new Error("多个原始指标映射到同一结果列。");
    const derivedName = derived?.outputName ? label(derived.outputName) : "";
    if (derivedName && labels.includes(derivedName)) throw new Error("派生指标输出列名与原始指标冲突。");
    const header = ["result_family", "dataset", "rate_percent", "eval_protocol", ...(showCase ? ["case"] : []), "jobs", ...labels.flatMap((name) => [name + "_mean", name + "_sd"]), ...(derivedName ? [derivedName + "_mean", derivedName + "_sd"] : [])];
    const ordered = [...chosen].sort((a, b) => a.record.method.localeCompare(b.record.method) || a.record.dataset.localeCompare(b.record.dataset) || Number(a.record.rate) - Number(b.record.rate) || a.record.endpoint.localeCompare(b.record.endpoint) || a.record.case.localeCompare(b.record.case));
    const rows = ordered.map((group) => {
      const seeds = [...group.seeds.values()];
      const expected = group.expected || seeds.length;
      const counts = metrics.map((name) => seeds.filter((seed) => name in seed).length).filter(Boolean);
      const jobs = counts.length ? Math.min(...counts) : seeds.length;
      const row: (string | number)[] = [group.record.method, group.record.dataset, group.record.rate, group.record.endpoint, ...(showCase ? [group.record.case] : []), jobs === expected ? String(jobs) : String(jobs) + "/" + expected];
      for (const name of metrics) {
        const values = seeds.map((seed) => seed[name]).filter(Number.isFinite);
        const complete = values.length === expected;
        const mean = complete ? values.reduce((a, b) => a + b, 0) / values.length : "";
        const sd = complete && values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - Number(mean)) ** 2, 0) / (values.length - 1)) : "";
        row.push(mean, sd);
      }
      if (derivedName) {
        const values = group.derived || [];
        const complete = values.length === expected;
        const mean = complete ? values.reduce((a, b) => a + b, 0) / values.length : "";
        const sd = complete && values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - Number(mean)) ** 2, 0) / (values.length - 1)) : "";
        row.push(mean, sd);
      }
      return row;
    });
    const mdHeader = header.filter((field) => !field.endsWith("_sd"));
    const mdRows = rows.map((row) => mdHeader.map((field) => {
      const index = header.indexOf(field);
      if (field.endsWith("_mean")) {
        const mean = row[index], sd = row[header.indexOf(field.slice(0, -5) + "_sd")];
        return mean === "" ? "—" : Number(mean).toFixed(4) + (sd === "" ? "" : " ± " + Number(sd).toFixed(4));
      }
      return String(row[index]).replace(/\|/g, "\\|");
    }));
    const markdown = "| " + mdHeader.join(" | ") + " |\n| " + mdHeader.map(() => "---").join(" | ") + " |\n" + mdRows.map((row) => "| " + row.join(" | ") + " |").join("\n") + "\n";
    return { header, rows, markdown };
  };
  const out: Record<string, ResultTable> = {};
  if (groups.length) out.final = make(groups);
  const methods = new Set(groups.map((group) => methodTableName(group.record.method)));
  for (const method of methods) out[method] = make(groups.filter((group) => methodTableName(group.record.method) === method));
  return out;
}

export function splitCsvByValues(csv: string, field: string, values: string[], columns: string[]): Record<string, string> {
  const { header, rows } = readCsv(csv);
  const index = header.indexOf(field);
  if (index < 0) throw new Error("拆表列不存在：" + field);
  const selected = new Set(values);
  if (!selected.size || selected.size > 100) throw new Error("请选择 1 至 100 个拆表值。");
  const kept = columns;
  if (!kept.length || kept.some((name) => !header.includes(name)) || new Set(kept).size !== kept.length) throw new Error("保留列无效。");
  const indices = kept.map((name) => header.indexOf(name));
  const output: Record<string, string> = {};
  for (const value of selected) {
    const matches = rows.filter((row) => row[index] === value);
    if (matches.length) output[value] = writeCsv(kept, matches.map((row) => indices.map((column) => row[column])));
  }
  if (!Object.keys(output).length) throw new Error("所选词条没有对应数据行。");
  return output;
}

type CatalogRow = { name: string; path: string; header: string[]; values: Record<string, string[]>; rowCount: number };
const catalogCache = new Map<string, { signature: string; rows: CatalogRow[] }>();
export function tableCatalog(root: string, resultDir: string): CatalogRow[] {
  const directory = path.join(root, ...resultDir.split("/"));
  if (!fs.existsSync(directory)) return [];
  const files = fs.readdirSync(directory, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort().map((name) => ({ name, file: path.join(directory, name, name + ".csv") })).filter((item) => fs.existsSync(item.file) && fs.lstatSync(item.file).isFile());
  const signature = files.map((item) => {
    const stat = fs.statSync(item.file);
    return item.name + ":" + stat.size + ":" + stat.mtimeMs + ":" + stat.ctimeMs;
  }).join("|");
  const cached = catalogCache.get(directory);
  if (cached?.signature === signature) return cached.rows;
  const rows = files.flatMap(({ name, file }) => {
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size > 32 * 1024 * 1024) return [];
      const parsed = readCsv(fs.readFileSync(file, "utf8"));
      const values: Record<string, string[]> = {};
      for (const [i, field] of parsed.header.entries()) values[field] = [...new Set(parsed.rows.map((row) => row[i]))].slice(0, 200);
      return [{ name, path: resultDir + "/" + name + "/" + name + ".csv", header: parsed.header, values, rowCount: parsed.rows.length }];
    } catch { return []; }
  });
  catalogCache.set(directory, { signature, rows });
  return rows;
}
