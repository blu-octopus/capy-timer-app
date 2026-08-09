/**
 * jest.setup.js mocks expo-sqlite to always reject, so client.ts and
 * repository.ts have no coverage against real SQL anywhere else in the
 * suite. This file overrides that mock locally (jest's per-file module
 * registry means it doesn't affect any other test file) with an adapter
 * over better-sqlite3 — a real, synchronous SQLite engine — so the actual
 * DDL and queries run against a real database instead of a fake.
 */

import BetterSqlite3, { type Database } from 'better-sqlite3';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    const raw = new (require('better-sqlite3'))(':memory:');
    return {
      execAsync: async (sql: string) => {
        raw.exec(sql);
      },
      runAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).run(...params),
      getAllAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).all(...params),
    };
  }),
}));

import { CREATE_TABLES } from '@/src/db/schema';
import { resetDatabaseHandle } from '@/src/db/client';
import {
  deleteCategory,
  getAllCategories,
  getSessionsInRange,
  insertCategory,
  insertSession,
} from '@/src/db/repository';
import { streakMatrix, summarize, timeframeRange } from '@/src/db/stats';

beforeEach(() => {
  resetDatabaseHandle();
});

function session(overrides: Partial<Parameters<typeof insertSession>[0]> & { id: string; startedAt: number }) {
  return {
    finishedAt: overrides.startedAt + 25 * 60_000,
    plannedMs: 25 * 60_000,
    focusMs: 25 * 60_000,
    breakMs: 0,
    loops: 1,
    categoryId: null,
    companionId: 'basic',
    coinsEarned: 25,
    skipped: 0,
    ...overrides,
  };
}

describe('CREATE_TABLES DDL', () => {
  it('is valid SQL and idempotent — running it twice does not throw', () => {
    const raw: Database = new BetterSqlite3(':memory:');
    expect(() => raw.exec(CREATE_TABLES)).not.toThrow();
    expect(() => raw.exec(CREATE_TABLES)).not.toThrow();
    raw.close();
  });
});

describe('session range queries', () => {
  it('treats the range start as inclusive and the end as exclusive, in start order', async () => {
    const day = 24 * 60 * 60_000;
    const base = Date.parse('2026-03-10T00:00:00Z');

    await insertSession(session({ id: 'before', startedAt: base - 1 }));
    await insertSession(session({ id: 'first', startedAt: base }));
    await insertSession(session({ id: 'middle', startedAt: base + day }));
    await insertSession(session({ id: 'last', startedAt: base + 2 * day - 1 }));
    await insertSession(session({ id: 'after', startedAt: base + 2 * day }));

    const rows = await getSessionsInRange({ start: base, end: base + 2 * day });
    expect(rows.map((r) => r.id)).toEqual(['first', 'middle', 'last']);
  });
});

describe('insertSession idempotency', () => {
  it('does not duplicate or throw when the same run id is recorded twice', async () => {
    const row = session({ id: 'ses_replay', startedAt: Date.now() });

    await insertSession(row);
    await expect(insertSession(row)).resolves.not.toThrow();

    const rows = await getSessionsInRange({ start: row.startedAt - 1, end: row.startedAt + 1 });
    expect(rows).toHaveLength(1);
  });
});

describe('deleteCategory', () => {
  it('nulls the category on sessions that referenced it, keeping their history', async () => {
    await insertCategory({ id: 'cat_study', name: 'study', color: 'blue', createdAt: 1 });
    const started = Date.now();
    await insertSession(session({ id: 'ses_1', startedAt: started, categoryId: 'cat_study' }));

    await deleteCategory('cat_study');

    expect(await getAllCategories()).toEqual([]);
    const [row] = await getSessionsInRange({ start: started - 1, end: started + 1 });
    expect(row!.categoryId).toBeNull();
  });
});

describe('end to end: real rows through summarize and streakMatrix', () => {
  it('aggregates focus time and marks streak days from actual database rows', async () => {
    const categories = [{ id: 'cat_study', name: 'study', color: 'blue', createdAt: 1 }];
    await insertCategory(categories[0]!);

    const monday = Date.parse('2026-03-09T09:00:00'); // a Monday
    const wednesday = Date.parse('2026-03-11T09:00:00');

    await insertSession(
      session({ id: 'mon', startedAt: monday, categoryId: 'cat_study', focusMs: 20 * 60_000 }),
    );
    await insertSession(
      session({ id: 'wed', startedAt: wednesday, categoryId: 'cat_study', focusMs: 30 * 60_000 }),
    );

    const range = timeframeRange('week', wednesday);
    const rows = await getSessionsInRange(range);

    const summary = summarize(rows);
    expect(summary.total).toBe(2);
    expect(summary.completed).toBe(2);
    expect(summary.focusMs).toBe(50 * 60_000);

    const streaks = streakMatrix(rows, categories, range);
    expect(streaks[0]!.checked).toEqual([true, false, true, false, false, false, false]);
  });
});
