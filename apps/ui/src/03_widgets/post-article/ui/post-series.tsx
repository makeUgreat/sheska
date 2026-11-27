import { useId } from 'react';
import { Link } from 'react-router-dom';
import { type GetPostResponse } from '@/entities/post';

type PostSeries = NonNullable<GetPostResponse['series']>;
type PostSeriesEntry = PostSeries['posts'][number];

export function SeriesLine({ series }: { series: PostSeries }) {
  return (
    <p className="mb-2 flex h-7 items-baseline gap-2.5">
      <span className="sr-only">Series</span>
      <span title={series.name} className="min-w-0 truncate font-sans text-title-sm leading-7 text-text-secondary">
        {series.name}
      </span>
      <span className="shrink-0 font-mono text-label-sm tracking-normal tabular-nums text-text-muted">
        {series.position} / {series.total}
      </span>
    </p>
  );
}

export function SeriesContents({ series, postId }: { series: PostSeries; postId: string }) {
  const headingId = useId();

  return (
    <nav aria-labelledby={headingId}>
      <p className="font-mono text-label-sm uppercase text-text-muted">Series</p>
      <h2 id={headingId} className="mt-1 break-words font-sans text-title-md text-text-primary">
        {series.name}
      </h2>
      <ol className="mt-3.5 flex flex-col">
        {series.posts.map((entry, index) => (
          <SeriesItem key={entry.postId} entry={entry} number={index + 1} current={entry.postId === postId} />
        ))}
      </ol>
    </nav>
  );
}

function SeriesItem({ entry, number, current }: { entry: PostSeriesEntry; number: number; current: boolean }) {
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] items-baseline py-1.5">
      <span
        aria-hidden="true"
        className={`font-mono text-label-sm tracking-normal tabular-nums ${current ? 'text-accent-strong' : 'text-text-muted/70'}`}
      >
        {String(number).padStart(2, '0')}
      </span>
      {current ? (
        <span aria-current="page" className="break-words text-body-md font-semibold text-accent-strong">
          {entry.title}
        </span>
      ) : (
        <Link
          to={`/posts/${entry.postId}`}
          className="break-words rounded-sm text-body-md text-text-secondary transition-colors duration-150 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {entry.title}
        </Link>
      )}
    </li>
  );
}
