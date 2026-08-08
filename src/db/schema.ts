import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A user-defined tag applied to sessions ("study", "workout"). Colors are
 * token names from the ColorPicker, not raw hex, so a palette change
 * re-themes existing categories.
 */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at').notNull(),
});

/**
 * One completed or abandoned focus run. Durations are stored in
 * milliseconds actually elapsed, so partial sessions still contribute
 * honest numbers to the dashboard.
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    /** Total duration the plan called for, for planned-vs-actual comparison. */
    plannedMs: integer('planned_ms').notNull(),
    focusMs: integer('focus_ms').notNull().default(0),
    breakMs: integer('break_ms').notNull().default(0),
    loops: integer('loops').notNull().default(1),
    categoryId: text('category_id'),
    companionId: text('companion_id'),
    coinsEarned: integer('coins_earned').notNull().default(0),
    /** 1 when the user ended early; partial focus still counts, coins do not. */
    skipped: integer('skipped').notNull().default(0),
  },
  (table) => [
    // Every dashboard query filters by time window first.
    index('sessions_started_at_idx').on(table.startedAt),
    index('sessions_category_idx').on(table.categoryId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * Applied on every launch. expo-sqlite has no migration runner of its own,
 * and these statements are idempotent, so this doubles as the initial
 * schema and the upgrade path.
 */
export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    planned_ms INTEGER NOT NULL,
    focus_ms INTEGER NOT NULL DEFAULT 0,
    break_ms INTEGER NOT NULL DEFAULT 0,
    loops INTEGER NOT NULL DEFAULT 1,
    category_id TEXT,
    companion_id TEXT,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON sessions (started_at);
  CREATE INDEX IF NOT EXISTS sessions_category_idx ON sessions (category_id);
`;
