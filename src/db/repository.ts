import { getDatabase } from './client';
import type { Category, NewCategory, NewSession, Session } from './schema';
import type { DateRange } from './stats';

/**
 * Data access for the dashboard. Time-window filtering happens in SQL (the
 * started_at index makes it cheap); shaping into buckets and slices happens
 * in `stats.ts`, where it stays testable without a native SQLite binding.
 */

interface SessionRow {
  id: string;
  started_at: number;
  finished_at: number | null;
  planned_ms: number;
  focus_ms: number;
  break_ms: number;
  loops: number;
  category_id: string | null;
  companion_id: string | null;
  coins_earned: number;
  skipped: number;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    plannedMs: row.planned_ms,
    focusMs: row.focus_ms,
    breakMs: row.break_ms,
    loops: row.loops,
    categoryId: row.category_id,
    companionId: row.companion_id,
    coinsEarned: row.coins_earned,
    skipped: row.skipped,
  };
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

export async function insertSession(session: NewSession): Promise<void> {
  const db = await getDatabase();
  // OR IGNORE: runs are recorded under a stable per-run id, and crash
  // recovery may replay the insert — the first write wins, replays no-op.
  await db.runAsync(
    `INSERT OR IGNORE INTO sessions
       (id, started_at, finished_at, planned_ms, focus_ms, break_ms, loops,
        category_id, companion_id, coins_earned, skipped)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.startedAt,
      session.finishedAt ?? null,
      session.plannedMs,
      session.focusMs ?? 0,
      session.breakMs ?? 0,
      session.loops ?? 1,
      session.categoryId ?? null,
      session.companionId ?? null,
      session.coinsEarned ?? 0,
      session.skipped ?? 0,
    ],
  );
}

export async function getSessionsInRange(range: DateRange): Promise<Session[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE started_at >= ? AND started_at < ? ORDER BY started_at ASC',
    [range.start, range.end],
  );
  return rows.map(toSession);
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY created_at ASC',
  );
  return rows.map(toCategory);
}

export async function insertCategory(category: NewCategory): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO categories (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    [category.id, category.name, category.color, category.createdAt],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  // Sessions keep their history; the tag just becomes "others" in reports.
  await db.runAsync('UPDATE sessions SET category_id = NULL WHERE category_id = ?', [id]);
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}
