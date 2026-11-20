/** 질문 줄을 화면 오른쪽 아래의 작은 버튼으로 접는다. 두 화살표가 안으로 모이는 모양이다. */
export function MinimizeButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="오른쪽 아래로 접기"
      title="오른쪽 아래로 접기"
      className={`flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[15px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 14 10 14 10 20" />
        <polyline points="20 10 14 10 14 4" />
        <line x1="14" y1="10" x2="21" y2="3" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    </button>
  );
}
