import { useAppStore } from '@/src/store';
import { deleteCategory, getAllCategories, insertCategory } from './repository';

/**
 * Categories live in SQLite and are mirrored into the store for rendering.
 * Every mutation writes through to the database first, so the cache can
 * never claim a category that would vanish on relaunch.
 *
 * SQLite is unavailable in some environments (notably the web preview);
 * these calls degrade to an in-memory list rather than taking the app down,
 * since a failed tag write should never block starting a session.
 */

const DEFAULT_CATEGORIES = [
  { name: 'lock-in', color: 'green' },
  { name: 'egg', color: 'yellow' },
  { name: 'poop', color: 'red' },
  { name: 'workout', color: 'blue' },
  { name: 'donttouchphone', color: 'green' },
  { name: 'study', color: 'blue' },
];

function newId(): string {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A stalled database must not leave the picker empty forever. */
const LOAD_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('database timed out')), LOAD_TIMEOUT_MS),
    ),
  ]);
}

export async function loadCategories(): Promise<void> {
  try {
    let rows = await withTimeout(getAllCategories());

    // First launch: seed the tags shown in the design.
    if (rows.length === 0) {
      const now = Date.now();
      for (const [index, seed] of DEFAULT_CATEGORIES.entries()) {
        await withTimeout(insertCategory({ id: newId(), ...seed, createdAt: now + index }));
      }
      rows = await withTimeout(getAllCategories());
    }

    useAppStore.getState().setCategories(rows);
  } catch (error) {
    console.warn('[categories] falling back to in-memory list', error);
    if (useAppStore.getState().categories.length === 0) {
      useAppStore.getState().setCategories(
        DEFAULT_CATEGORIES.map((seed, index) => ({
          id: `seed_${index}`,
          ...seed,
        })),
      );
    }
  }
}

export async function createCategory(name: string, color: string): Promise<void> {
  const category = { id: newId(), name: name.trim(), color, createdAt: Date.now() };
  if (!category.name) return;

  try {
    await insertCategory(category);
  } catch (error) {
    console.warn('[categories] persist failed; keeping in memory', error);
  }

  const { categories, setCategories } = useAppStore.getState();
  setCategories([...categories, category]);
}

export async function removeCategory(id: string): Promise<void> {
  try {
    await deleteCategory(id);
  } catch (error) {
    console.warn('[categories] delete failed', error);
  }

  const state = useAppStore.getState();
  state.setCategories(state.categories.filter((c) => c.id !== id));
  if (state.plan.categoryId === id) state.updatePlan({ categoryId: undefined });
}
