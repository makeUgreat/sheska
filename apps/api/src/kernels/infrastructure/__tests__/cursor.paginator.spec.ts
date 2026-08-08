import { describe, expect, it } from 'vitest';
import { sliceForCursor } from '../cursor.paginator';

describe('sliceForCursor', () => {
  it('returns all rows and no next cursor when rows fit within the limit', () => {
    const rows = [{ id: '1' }, { id: '2' }];

    const result = sliceForCursor(rows, 2, (row) => ({ id: row.id }));

    expect(result.data).toEqual(rows);
    expect(result.nextCursor).toBeNull();
  });

  it('trims the overfetched row and builds the next cursor from the last kept row', () => {
    const rows = [{ id: '1' }, { id: '2' }, { id: '3' }];

    const result = sliceForCursor(rows, 2, (row) => ({ id: row.id }));

    expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.nextCursor).toEqual({ id: '2' });
  });

  it('includes fields the caller adds to the cursor, such as a search score', () => {
    const rows = [
      { id: '1', score: 0.9 },
      { id: '2', score: 0.5 },
      { id: '3', score: 0.1 },
    ];

    const result = sliceForCursor(rows, 2, (row) => ({
      id: row.id,
      score: row.score,
    }));

    expect(result.nextCursor).toEqual({ id: '2', score: 0.5 });
  });

  it('returns no next cursor for an empty result', () => {
    const result = sliceForCursor<{ id: string }, { id: string }>(
      [],
      2,
      (row) => ({ id: row.id }),
    );

    expect(result.data).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
