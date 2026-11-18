const GLYPH =
  'opacity-0 transition-opacity duration-150 ease-out group-hover/lights:opacity-100 group-focus-within/lights:opacity-100';
const GLYPH_COLOR = 'rgba(0,0,0,0.55)';

/** macOS 창처럼 세 점에 올리면 세 기호가 함께 보인다. 동작은 노란 점에만 있다. */
export function TrafficLights({
  yellowLabel,
  onYellowClick,
}: {
  yellowLabel: string;
  onYellowClick: () => void;
}) {
  return (
    <span className="group/lights flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-3 w-3 rounded-full bg-terminal-red"
      >
        <svg className={GLYPH} width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M3.75 3.75l4.5 4.5M8.25 3.75l-4.5 4.5"
            stroke={GLYPH_COLOR}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {/* 보이는 점은 12px이고 누르는 영역은 24px이다. */}
      <button
        type="button"
        aria-label={yellowLabel}
        onClick={onYellowClick}
        className="-m-1.5 flex rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-3 w-3 rounded-full bg-terminal-yellow">
          <svg
            className={GLYPH}
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
          >
            <path
              d="M3.25 6h5.5"
              stroke={GLYPH_COLOR}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      <span
        aria-hidden="true"
        className="flex h-3 w-3 rounded-full bg-terminal-green"
      >
        <svg className={GLYPH} width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M3.5 3.5h3.25L3.5 6.75zM8.5 8.5H5.25L8.5 5.25z"
            fill={GLYPH_COLOR}
          />
        </svg>
      </span>
    </span>
  );
}
