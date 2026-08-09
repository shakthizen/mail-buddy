import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { migrations } from './migrations';
import { env } from '../env';
import { logger } from '../lib/logger';

const dbLogger = logger.withTag('db');
const databasePath = env.DATABASE_PATH;

const sqlite = new Database(databasePath, { create: true });
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

function runMigrations() {
  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
      tag TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );`,
  );

  const applied = new Set(
    sqlite.query('SELECT tag FROM _migrations').all().map((row: any) => row.tag as string),
  );

  for (const migration of migrations) {
    if (applied.has(migration.tag)) continue;

    sqlite.transaction(() => {
      for (const statement of migration.sql.split('--> statement-breakpoint')) {
        const trimmed = statement.trim();
        if (trimmed.length === 0) continue;
        sqlite.exec(trimmed);
      }
      sqlite.query('INSERT INTO _migrations (tag) VALUES (?)').run(migration.tag);
    })();

    dbLogger.info(`applied migration ${migration.tag}`);
  }
}

runMigrations();
