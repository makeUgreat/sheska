export type PageCursor = {
  readonly id: string;
};

export type RankedPageCursor = PageCursor & {
  readonly score: number;
};

export type CursorPageResult<TRow, TCursor extends PageCursor> = {
  readonly data: TRow[];
  readonly nextCursor: TCursor | null;
};

export function sliceForCursor<TRow, TCursor extends PageCursor>(
  rows: TRow[],
  limit: number,
  getCursor: (row: TRow) => TCursor,
): CursorPageResult<TRow, TCursor> {
  const hasNext = rows.length > limit;
  const data = rows.slice(0, limit);
  const lastRow = data[data.length - 1];
  const nextCursor = hasNext && lastRow ? getCursor(lastRow) : null;

  return { data, nextCursor };
}
