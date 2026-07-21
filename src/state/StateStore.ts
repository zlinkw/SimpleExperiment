import * as fs from "fs/promises";
import * as path from "path";

export type StateReadResult<T> =
  | { ok: true; value: T; migrated?: boolean }
  | { ok: false; error: string; lastKnownGood?: T };

export async function atomicWriteText(file: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${Date.now()}.${process.pid}`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, file);
}

export async function readJsonState<T>(
  file: string,
  validate: (value: any) => value is T,
  migrate: (value: any) => T,
  lastKnownGood?: T,
): Promise<StateReadResult<T>> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    if (validate(parsed)) return { ok: true, value: parsed };
    const migrated = migrate(parsed);
    if (validate(migrated)) return { ok: true, value: migrated, migrated: true };
    return { ok: false, error: "schema validation failed", lastKnownGood };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), lastKnownGood };
  }
}

export async function writeJsonState<T extends { schemaVersion?: number }>(
  file: string,
  value: T,
  schemaVersion: number,
  validate: (value: any) => value is T,
): Promise<void> {
  const next = { ...value, schemaVersion };
  if (!validate(next)) throw new Error(`state validation failed: ${file}`);
  await atomicWriteText(file, JSON.stringify(next, null, 2));
}
