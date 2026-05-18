import type Database from "better-sqlite3";
import { migration001 } from "./migrations/001_initial.js";

const MIGRATIONS: Array<{ version: number; up: (db: Database.Database) => void }> = [
  { version: 1, up: migration001 },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set<number>(
    db.prepare("SELECT version FROM schema_migrations").pluck().all() as number[]
  );

  const insertMigration = db.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)"
  );

  for (const { version, up } of MIGRATIONS) {
    if (!applied.has(version)) {
      db.transaction(() => {
        up(db);
        insertMigration.run(version, new Date().toISOString());
      })();
    }
  }
}
