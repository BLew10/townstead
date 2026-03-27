import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STATE_FILE = join(__dirname, "id-map-state.json");

type TableMap = Map<string, string>;

const maps = new Map<string, TableMap>();

export function set(table: string, v1Id: string, v2Id: string): void {
  if (!maps.has(table)) maps.set(table, new Map());
  maps.get(table)!.set(v1Id, v2Id);
}

export function get(table: string, v1Id: string): string | undefined {
  return maps.get(table)?.get(v1Id);
}

export function has(table: string, v1Id: string): boolean {
  return maps.get(table)?.has(v1Id) ?? false;
}

export function getOrThrow(table: string, v1Id: string): string {
  const v2Id = get(table, v1Id);
  if (!v2Id) throw new Error(`Missing ID mapping for ${table}:${v1Id}`);
  return v2Id;
}

export function save(): void {
  const serializable: Record<string, Record<string, string>> = {};
  for (const [table, map] of maps) {
    serializable[table] = Object.fromEntries(map);
  }
  writeFileSync(STATE_FILE, JSON.stringify(serializable, null, 2));
}

export function load(): void {
  if (!existsSync(STATE_FILE)) return;
  const raw = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as Record<
    string,
    Record<string, string>
  >;
  for (const [table, entries] of Object.entries(raw)) {
    maps.set(table, new Map(Object.entries(entries)));
  }
}

export function getTableSize(table: string): number {
  return maps.get(table)?.size ?? 0;
}

export function clear(): void {
  maps.clear();
}
