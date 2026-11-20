/** 12×9 칸에 그린다. 챙과 방울은 바탕색 면에 아이콘 색 선을 둘러 밝은 배경에서도 보인다. */
export function SantaHat({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path className="fill-accent" d="M1.6 6C2.2 2.4 5 .2 8.6.7c2 .3 3 1.3 3.4 2.7L10 6Z" />
      <circle className="fill-page-background stroke-current" cx={12} cy={3.4} r={1.55} strokeWidth={0.9} />
      <rect className="fill-page-background stroke-current" x={0.5} y={5.3} width={10.8} height={3} rx={1.5} strokeWidth={0.9} />
    </g>
  );
}
