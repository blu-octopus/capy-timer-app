import * as SQLite from 'expo-sqlite';

import { CREATE_TABLES } from './schema';

const DATABASE_NAME = 'capytimer.db';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Opens the database and applies the schema. Safe to call repeatedly — the
 * handle is cached and the DDL is idempotent.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // WAL keeps reads from blocking while a session write is in flight.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(CREATE_TABLES);

  database = db;
  return db;
}

/** Test/reset hook — drops the cached handle so the next call reopens. */
export function resetDatabaseHandle() {
  database = null;
}
