import type { Meta, StoryObj } from '@storybook/react-vite';
import { parseOutline } from '../lib';
import { ArticleLayout } from './article-layout';

/**
 * The outline is `fixed`, so it measures itself against the viewport — here the
 * Storybook canvas iframe, not the browser window. Reproducing the detail page's
 * centred measure column is what makes that measurement mean anything: without
 * it the outline still renders, beside a body that is nowhere near where the
 * real page puts it. Widen the canvas past 1024px to see the outline at all,
 * and past 1200px to see it stay open.
 */
const AS_THE_DETAIL_PAGE_PLACES_IT =
  'min-h-screen bg-page-background px-4 py-14';

function Header({ title }: { title: string }) {
  return (
    <>
      <h1 className="break-words font-sans text-headline-lg text-text-primary">
        {title}
      </h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-label-sm uppercase text-text-muted">
        <span>Sep 22, 2026</span>
        <span
          aria-hidden="true"
          className="h-1 w-1 rounded-full bg-outline-variant"
        />
        <span>128 views</span>
      </p>
    </>
  );
}

const BODY = [
  '문서는 머리말 한 문단으로 시작한다.',
  '',
  '## 배경',
  '',
  '한 섹션은 본문 몇 문단과 그 아래 하위 섹션으로 이어진다.',
  '',
  '### 기존 방식',
  '',
  '- 목록 항목 하나',
  '- 목록 항목 둘',
  '',
  '## 설계',
  '',
  '`--spacing-measure`는 읽기 컬럼의 상한이다.',
  '',
  '## 결론',
  '',
  '마지막 섹션이다.',
].join('\n');

/** Section titles come from note headings, so a title that outruns the outline is ordinary. */
const LONG_HEADING_BODY = [
  '제목이 목차 폭을 넘으면 줄을 늘리지 않고 끝을 자른다.',
  '',
  '## 문서 구조를 한눈에 파악하기 위한 아주 길고 장황한 섹션 제목',
  '',
  '본문 한 문단.',
  '',
  '### A deliberately long English subsection heading that no outline width will hold',
  '',
  '본문 한 문단.',
  '',
  '## 결론',
  '',
  '마지막 섹션이다.',
].join('\n');

const meta = {
  title: 'Shared UI/ArticleLayout',
  component: ArticleLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className={AS_THE_DETAIL_PAGE_PLACES_IT}>
        <div className="mx-auto max-w-measure">
          <Story />
        </div>
      </main>
    ),
  ],
} satisfies Meta<typeof ArticleLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithOutline: Story = {
  args: {
    header: <Header title="Feature-Sliced Design in the Sheska UI" />,
    body: BODY,
    outline: parseOutline(BODY),
    activeHeadingId: parseOutline(BODY)[1].id,
  },
};

export const LongHeadings: Story = {
  args: {
    header: <Header title="목차 폭을 넘어가는 제목" />,
    body: LONG_HEADING_BODY,
    outline: parseOutline(LONG_HEADING_BODY),
    activeHeadingId: parseOutline(LONG_HEADING_BODY)[0].id,
  },
};

export const WithFooter: Story = {
  args: {
    ...WithOutline.args,
    footer: (
      <footer className="mt-14 border-t border-outline-variant/20 pt-6">
        <p className="font-mono text-label-sm uppercase text-text-muted">
          topics · layout · outline
        </p>
      </footer>
    ),
  },
};

/** One heading stays under `OUTLINE_MINIMUM_HEADINGS`, so no outline is drawn. */
export const WithoutOutline: Story = {
  args: {
    header: <Header title="헤딩이 하나뿐인 문서" />,
    body: ['## 하나뿐인 섹션', '', '본문 한 문단.'].join('\n'),
    outline: parseOutline('## 하나뿐인 섹션'),
    activeHeadingId: null,
  },
};
