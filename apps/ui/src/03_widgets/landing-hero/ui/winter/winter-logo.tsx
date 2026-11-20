import { Fragment } from 'react';

/** 첫 줄은 별이라 로고보다 한 줄 위에서 시작하고, 마지막 줄 줄기가 로고 바닥에 맞는다. */
const TREE = ['    *', '   /.\\', '  /o.*\\', ' /*.o.o\\', '   |_|'];
const GAP = '  ';

function TreeRow({ row }: { row: number }) {
  return [...TREE[row]].map((char, column) => {
    const key = `${row}-${column}`;
    switch (char) {
      case ' ':
        return char;
      case '*':
        return row === 0 ? (
          <span key={key} className="text-terminal-output-error">
            *
          </span>
        ) : (
          <span
            key={key}
            className="animate-tree-light text-terminal-output-error motion-reduce:animate-none"
            style={{ animationDelay: `${(row + column) * 0.4}s` }}
          >
            *
          </span>
        );
      case 'o':
        return (
          <span key={key} className="text-accent">
            o
          </span>
        );
      case '|':
      case '_':
        return (
          <span key={key} className="text-on-surface-muted">
            {char}
          </span>
        );
      default:
        return (
          <span key={key} className="text-terminal-output-success">
            {char}
          </span>
        );
    }
  });
}

/** 로고 첫 줄의 `_`를 흰색으로 칠해 글자 위에 눈이 앉은 것처럼 보이게 한다. */
export function WinterLogo({ logo }: { logo: string }) {
  const lines = logo.split('\n');

  return (
    <>
      {' '.repeat(lines[0].length) + GAP}
      <TreeRow row={0} />
      {lines.map((line, index) => (
        <Fragment key={line}>
          {'\n'}
          {index === 0 ? <span className="text-white">{line}</span> : line}
          {GAP}
          <TreeRow row={index + 1} />
        </Fragment>
      ))}
    </>
  );
}
