import Database from "better-sqlite3";
import * as os from "node:os";
import * as path from "node:path";
import { runMigrations } from "./schema.js";

const defaultDbPath = (): string =>
  process.env["CREATORMESH_DB_PATH"] ??
  path.join(os.homedir(), "creator-mesh-runtime", "creator-mesh.sqlite");

let _singleton: Database.Database | null = null;

/**
 * Opens (or returns cached) a SQLite database and runs pending migrations.
 * Pass an explicit path to open a separate instance (useful for tests with :memory:).
 */
export function openDb(dbPath?: string): Database.Database {
  const resolved = dbPath ?? defaultDbPath();
  if (!dbPath && _singleton) return _singleton;

  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);

  if (!dbPath) _singleton = db;
  return db;
}

export function closeDb(): void {
  if (_singleton) {
    _singleton.close();
    _singleton = null;
  }
}
