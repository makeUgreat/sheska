const MAX_VISIBLE_PAGES = 10;

function getVisiblePageRange(page: number, totalPages: number): number[] {
  const windowSize = Math.min(MAX_VISIBLE_PAGES, totalPages);
  let start = page - Math.floor(windowSize / 2);
  start = Math.max(1, Math.min(start, totalPages - windowSize + 1));
  return Array.from({ length: windowSize }, (_, i) => start + i);
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePageRange(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-2 font-mono text-xs font-medium uppercase tracking-widest"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-2 py-1 text-text-secondary transition-colors hover:text-[#e06c75] disabled:pointer-events-none disabled:opacity-40"
      >
        Prev
      </button>
      {visiblePages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={
            pageNumber === page
              ? 'px-2 py-1 text-[#e06c75]'
              : 'px-2 py-1 text-text-secondary transition-colors hover:text-[#e06c75]'
          }
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-2 py-1 text-text-secondary transition-colors hover:text-[#e06c75] disabled:pointer-events-none disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
