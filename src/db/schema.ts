/**
 * Row shapes for the two tables, hand-written to match CREATE_TABLES below.
 * expo-sqlite has no query builder of its own and drizzle-orm was only ever
 * used here for its inferred types (repository.ts writes raw SQL), so these
 * are plain interfaces rather than a drizzle schema — one fewer runtime
 * dependency for the same type safety.
 */

/** A user-defined tag applied to sessions ("study", "workout"). Colors are
 * token names from the ColorPicker, not raw hex, so a palette change
 * re-themes existing categories. */
export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export type NewCategory = Category;

/**
 * One completed or abandoned focus run. Durations are stored in
 * milliseconds actually elapsed, so partial sessions still contribute
 * honest numbers to the dashboard.
 */
export interface Session {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  /** Total duration the plan called for, for planned-vs-actual comparison. */
  plannedMs: number;
  focusMs: number;
  breakMs: number;
  loops: number;
  categoryId: string | null;
  companionId: string | null;
  coinsEarned: number;
  /** 1 when the user skipped or ended early; focus/coins reflect time actually worked. */
  skipped: number;
}

export type NewSession = Partial<Session> &
  Pick<Session, 'id' | 'startedAt' | 'plannedMs'>;

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
