import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { CREATE_TABLES } from './schema';

const DATABASE_NAME = 'capytimer.db';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Opens the database and applies the schema. Safe to call repeatedly — the
 * handle is cached and the DDL is idempotent.
 *
 * iOS and Android are the shipping targets. expo-sqlite's web build runs in
 * a worker that the dev bundler cannot load, and it stalls rather than
 * failing, so callers would wait forever; reject up front instead and let
 * them use their in-memory fallback.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web');
  }

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
