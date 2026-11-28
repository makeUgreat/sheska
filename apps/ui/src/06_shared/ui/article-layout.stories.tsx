import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, spyOn } from 'storybook/test';
import { ArticleLayout } from './article-layout';

const AS_THE_DETAIL_PAGE_PLACES_IT = 'min-h-screen bg-page-background px-4 py-14';

function Header({ title }: { title: string }) {
  return (
    <>
      <h1 className="break-words font-sans text-headline-lg text-text-primary">{title}</h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-label-sm uppercase text-text-muted">
        <span>Sep 22, 2026</span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
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

const meta = {
  title: 'Shared/ArticleLayout',
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

export const Default: Story = {
  args: {
    header: <Header title="Feature-Sliced Design in the Sheska UI" />,
    body: BODY,
  },
};

export const WithFooter: Story = {
  args: {
    ...Default.args,
    footer: (
      <footer className="mt-14 border-t border-outline-variant/20 pt-6">
        <p className="font-mono text-label-sm uppercase text-text-muted">topics · layout · outline</p>
      </footer>
    ),
  },
};

const ONE_HEADING = ['## 배경', '', '본문'].join('\n');

export const EmptyBodyKeepsHeader: Story = {
  name: '본문이 비어 있어도 header는 보여준다',
  tags: ['!dev'],
  args: { header: <h1>제목</h1>, body: '' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '제목' })).toBeDefined();
  },
};

export const FooterInsideArticle: Story = {
  name: 'footer를 article 안에 렌더링한다',
  tags: ['!dev'],
  args: { header: <h1>제목</h1>, body: ONE_HEADING, footer: <p>topics</p> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('article').contains(canvas.getByText('topics'))).toBe(true);
  },
};

function allowMotion() {
  const matchMedia = spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);

  return () => matchMedia.mockRestore();
}

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function stepInDelays({ canvas }: PlayContext) {
  const blocks = [canvas.getByRole('heading', { name: '제목' }), canvas.getByRole('heading', { name: '배경' }), canvas.getByText('본문')];

  return blocks.map((block) => block.getAnimations().map((animation) => animation.effect?.getTiming().delay));
}

export const BlocksStepInInOrder: Story = {
  name: '머리의 줄과 본문의 block이 순서대로 45ms 간격을 두고 올라온다',
  tags: ['!dev'],
  args: { header: <h1>제목</h1>, body: ONE_HEADING },
  beforeEach: allowMotion,
  play: async (context) => {
    await expect(stepInDelays(context)).toEqual([[0], [45], [90]]);
  },
};

export const BlocksWaitHidden: Story = {
  name: '차례가 오기 전의 block은 보이지 않다가 제자리로 올라온다',
  tags: ['!dev'],
  args: { header: <h1>제목</h1>, body: ONE_HEADING },
  beforeEach: allowMotion,
  play: async ({ canvas }) => {
    const block = canvas.getByText('본문');
    const [animation] = block.getAnimations();
    animation?.pause();

    if (animation) animation.currentTime = 0;
    const waiting = getComputedStyle(block).opacity;
    if (animation) animation.currentTime = 90 + 320;
    const settled = getComputedStyle(block).opacity;

    await expect([waiting, settled]).toEqual(['0', '1']);
  },
};

export const ReducedMotionStaysStill: Story = {
  name: '움직임 줄이기 설정이면 block을 움직이지 않는다',
  tags: ['!dev'],
  args: { header: <h1>제목</h1>, body: ONE_HEADING },
  play: async (context) => {
    await expect(stepInDelays(context)).toEqual([[], [], []]);
  },
};
