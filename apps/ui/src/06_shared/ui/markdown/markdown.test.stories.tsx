import type { Meta, StoryObj } from '@storybook/react-vite';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { MARKDOWN_PLUGINS, parseOutline } from '../../lib/markdown';
import { AttachmentBaseUrlProvider } from './attachment-base-url';
import imageUnavailable from './image-unavailable.svg';
import { Markdown } from './markdown';
import { MARKDOWN_COMPONENTS } from './markdown-components';
import { pinSectionOnClick } from './use-section-focus';

const meta = {
  title: 'Shared/Markdown/Behavior',
  component: Markdown,
  args: { body: '' },
  decorators: [
    (Story) => (
      <div className="w-measure max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Markdown>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

/** Width decorator의 `div` 바로 아래가 `Markdown`의 본문 요소다. */
const articleOf = (canvasElement: HTMLElement) => canvasElement.firstElementChild?.firstElementChild;

export const GfmTable: Story = {
  name: 'GFM 표 문법을 table로 렌더한다',
  tags: ['!dev'],
  args: { body: ['| Option | Default |', '| --- | --- |', '| retry | 3 |'].join('\n') },
  play: async ({ canvas }) => {
    const table = canvas.getByRole('table');

    await expect(within(table).getByRole('columnheader', { name: 'Option' })).toBeDefined();
    await expect(within(table).getByRole('cell', { name: 'retry' })).toBeDefined();
  },
};

export const Strikethrough: Story = {
  name: '취소선 문법을 del로 렌더한다',
  tags: ['!dev'],
  args: { body: '~~폐기된 방식~~을 더 쓰지 않는다' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('deletion').textContent).toBe('폐기된 방식');
  },
};

export const SingleTilde: Story = {
  name: '물결표 하나는 취소선으로 읽지 않는다',
  tags: ['!dev'],
  args: { body: '1~2장 그리고 3~4장' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('deletion')).toBe(null);
  },
};

export const TaskList: Story = {
  name: 'task list의 체크 상태를 그대로 보여준다',
  tags: ['!dev'],
  args: { body: ['- [x] 끝난 일', '- [ ] 남은 일'].join('\n') },
  play: async ({ canvas }) => {
    const [done, todo] = canvas.getAllByRole('checkbox');

    await expect((done as HTMLInputElement).checked).toBe(true);
    await expect((todo as HTMLInputElement).checked).toBe(false);
  },
};

export const BareUrl: Story = {
  name: '맨 URL을 링크로 만든다',
  tags: ['!dev'],
  args: { body: '참고: https://example.com/docs' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'https://example.com/docs' })).toBeDefined();
  },
};

export const HeadingShift: Story = {
  name: 'page 제목 아래에 놓이도록 heading을 한 단계씩 낮춘다',
  tags: ['!dev'],
  args: { body: ['# 하나', '## 둘', '### 셋', '#### 넷', '##### 다섯'].join('\n') },
  play: async ({ canvas }) => {
    await expect([2, 3, 4, 5, 6].map((level) => canvas.getByRole('heading', { level }).textContent)).toEqual([
      '하나',
      '둘',
      '셋',
      '넷',
      '다섯',
    ]);
  },
};

export const SixthHeading: Story = {
  name: '더 내려갈 단계가 없는 `######`은 h6에 둔다',
  tags: ['!dev'],
  args: { body: '###### 여섯' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 6 }).textContent).toBe('여섯');
  },
};

function fence(language: string, ...lines: string[]) {
  return ['```' + language, ...lines, '```'].join('\n');
}

/** Highlighter는 나중에 도착하므로 fence에 hljs class가 붙을 때까지 기다린다. */
async function waitForHighlight(canvasElement: HTMLElement) {
  await waitFor(() => expect(canvasElement.querySelector('.hljs')).not.toBe(null));
}

export const FenceLanguageLabel: Story = {
  name: 'fence에 적은 언어를 라벨로 보여준다',
  tags: ['!dev'],
  args: { body: fence('ts', 'const retry = 3;') },
  play: async ({ canvas, canvasElement }) => {
    await waitForHighlight(canvasElement);

    await expect(canvas.getByText('ts')).toBeDefined();
  },
};

export const FencePlainTextLabel: Story = {
  name: '언어를 적지 않은 fence는 text로 라벨을 단다',
  tags: ['!dev'],
  args: { body: fence('', 'plain line') },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('text')).toBeDefined();
  },
};

export const FenceKeywordToken: Story = {
  name: '등록한 언어의 keyword를 highlight token으로 쪼갠다',
  tags: ['!dev'],
  args: { body: fence('ts', 'const retry = 3;') },
  play: async ({ canvasElement }) => {
    await waitForHighlight(canvasElement);

    await expect(canvasElement.querySelector('.hljs-keyword')?.textContent).toBe('const');
  },
};

export const FenceInListItem: Story = {
  name: '목록 항목 안의 fence도 highlight한다',
  tags: ['!dev'],
  args: { body: ['- 설정', '', '  ```ts', '  const retry = 3;', '  ```'].join('\n') },
  play: async ({ canvasElement }) => {
    await waitForHighlight(canvasElement);

    await expect(canvasElement.querySelector('.hljs-keyword')?.textContent).toBe('const');
  },
};

export const FenceUnknownLanguage: Story = {
  name: '등록하지 않은 언어는 원문 그대로 둔다',
  tags: ['!dev'],
  args: { body: fence('brainfuck', '+[----->+++<]>+.') },
  play: async ({ canvas, canvasElement }) => {
    await waitForHighlight(canvasElement);

    await expect(canvasElement.querySelector('.hljs-keyword')).toBe(null);
    await expect(canvas.getByText('+[----->+++<]>+.')).toBeDefined();
  },
};

export const CopyFenceSource: Story = {
  name: '복사 버튼이 fence 원문을 클립보드에 넣는다',
  tags: ['!dev'],
  args: { body: fence('ts', 'const retry = 3;') },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await waitForHighlight(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Copy code' }));

    await expect(writeText).toHaveBeenCalledWith('const retry = 3;\n');
  },
};

export const CopyStatus: Story = {
  name: '복사한 뒤 결과를 status로 알린다',
  tags: ['!dev'],
  args: { body: fence('ts', 'const retry = 3;') },
  play: async ({ canvas, canvasElement, userEvent }) => {
    spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await waitForHighlight(canvasElement);

    await expect(canvas.getByRole('status').textContent).toBe('');
    await userEvent.click(canvas.getByRole('button', { name: 'Copy code' }));

    await expect((await canvas.findByRole('status')).textContent).toBe('Copied');
  },
};

export const InlineCode: Story = {
  name: 'inline code에는 코드 블록 chrome을 붙이지 않는다',
  tags: ['!dev'],
  args: { body: '옵션은 `retry`다' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Copy code' })).toBe(null);
    await expect(canvas.getByText('retry').tagName).toBe('CODE');
  },
};

/** KaTeX는 나중에 도착하므로 수식에 katex class가 붙을 때까지 기다린다. */
async function waitForKatex(canvasElement: HTMLElement) {
  await waitFor(() => expect(canvasElement.querySelector('.katex')).not.toBe(null));
}

export const InlineMath: Story = {
  name: '`$`로 감싼 글자를 inline 수식으로 그리고 `$`는 보이지 않는다',
  tags: ['!dev'],
  args: { body: '관계 수는 $M:N$이다' },
  play: async ({ canvasElement }) => {
    await waitForKatex(canvasElement);

    await expect(canvasElement.querySelector('.katex-display')).toBe(null);
    await expect(canvasElement.textContent).not.toContain('$');
  },
};

export const DisplayMathBlock: Story = {
  name: '`$$` block을 display 수식으로 그린다',
  tags: ['!dev'],
  args: { body: ['$$', 'N \\times M', '$$'].join('\n') },
  play: async ({ canvas, canvasElement }) => {
    await waitForKatex(canvasElement);

    await expect(canvasElement.querySelector('.katex-display')).not.toBe(null);
    await expect(canvas.queryByRole('button', { name: 'Copy code' })).toBe(null);
  },
};

export const OneLineDisplayMath: Story = {
  name: '한 줄 `$$` 수식만 있는 문단을 display 수식으로 그린다',
  tags: ['!dev'],
  args: { body: '$$N \\times M$$' },
  play: async ({ canvasElement }) => {
    await waitForKatex(canvasElement);

    await expect(canvasElement.querySelector('.katex-display')).not.toBe(null);
  },
};

/** 다음 글은 story와 별도의 root에 그려서, 첫 commit의 DOM을 `flushSync`로 바로 읽는다. */
export const KatexReusedOnNextPost: Story = {
  name: '한 번 받은 KaTeX는 다음 글의 첫 화면부터 쓴다',
  tags: ['!dev'],
  args: { body: '$N$' },
  play: async ({ canvasElement }) => {
    await waitForKatex(canvasElement);

    const nextPost = document.createElement('div');
    canvasElement.append(nextPost);
    const root = createRoot(nextPost);
    flushSync(() => root.render(<Markdown body="$M$" />));
    const katex = nextPost.querySelector('.katex');
    root.unmount();
    nextPost.remove();

    await expect(katex).not.toBe(null);
  },
};

export const InvalidMath: Story = {
  name: '잘못된 수식은 본문을 깨뜨리지 않고 원문을 남긴다',
  tags: ['!dev'],
  args: { body: '앞 $\\frac{1$ 뒤' },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('.katex-error')?.textContent).toBe('\\frac{1'));
    await expect(canvasElement.textContent).toContain('뒤');
  },
};

/** KaTeX를 받기 전의 화면은 rehype plugin 없이 그린 결과와 같다. */
const beforeKatex: Story['render'] = ({ body }) => (
  <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={MARKDOWN_PLUGINS}>
    {body}
  </ReactMarkdown>
);

export const InlineMathBeforeKatex: Story = {
  name: 'inline 수식을 code 모양 없이 원문 글자로 둔다',
  tags: ['!dev'],
  render: beforeKatex,
  args: { body: '관계 수는 $M:N$이다' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('code')).toBe(null);
    await expect(canvasElement.textContent).toBe('관계 수는 M:N이다');
  },
};

export const MathBlockBeforeKatex: Story = {
  name: '수식 block에 code fence의 언어 라벨과 복사 버튼을 붙이지 않는다',
  tags: ['!dev'],
  render: beforeKatex,
  args: { body: ['$$', 'N \\times M', '$$'].join('\n') },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('pre')).toBe(null);
    await expect(canvas.queryByRole('button', { name: 'Copy code' })).toBe(null);
    await expect(canvasElement.textContent).toBe('N \\times M');
  },
};

export const WikiLink: Story = {
  name: 'wiki link를 unresolved 표기로 바꾼다',
  tags: ['!dev'],
  args: { body: '[[feature-sliced-design|FSD]]를 따른다' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTitle('FSD — no note yet')).toBeDefined();
  },
};

export const WikiLinkInStrong: Story = {
  name: '강조 안의 wiki link도 unresolved 표기로 바꾼다',
  tags: ['!dev'],
  args: { body: '- **[[feature-sliced-design|FSD]]**' },
  play: async ({ canvas }) => {
    await expect(canvas.getByTitle('FSD — no note yet')).toBeDefined();
  },
};

export const WikiLinkInTable: Story = {
  name: '표 안의 wiki link도 unresolved 표기로 바꾼다',
  tags: ['!dev'],
  args: { body: ['| Note |', '| --- |', '| [[feature-sliced-design\\|FSD]] |'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.getByTitle('FSD — no note yet')).toBeDefined();
  },
};

export const WikiLinkInFence: Story = {
  name: 'code fence 안의 wiki link 문법은 원문 그대로 둔다',
  tags: ['!dev'],
  args: { body: ['```txt', '[[feature-sliced-design|FSD]]', '```'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTitle('FSD — no note yet')).toBe(null);
    await expect(canvas.getByText('[[feature-sliced-design|FSD]]')).toBeDefined();
  },
};

export const BlockMarkHidden: Story = {
  name: '블록 표시는 본문에 글자로 남기지 않는다',
  tags: ['!dev'],
  args: { body: ['인용 밖 문단', '', '^36406d'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/\^36406d/)).toBe(null);
  },
};

export const BlockMarkAnchorsPreviousBlock: Story = {
  name: '블록 표시는 바로 앞 블록을 anchor로 만든다',
  tags: ['!dev'],
  args: { body: ['인용 밖 문단', '', '^36406d'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('인용 밖 문단').id).toBe('block-36406d');
  },
};

export const BlockMarkInQuote: Story = {
  name: '인용 마지막 줄의 블록 표시는 인용 전체를 anchor로 만든다',
  tags: ['!dev'],
  args: { body: ['> 인용한 문장', '> ^c58057'].join('\n') },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('blockquote')?.id).toBe('block-c58057');
  },
};

export const BlockMarkAfterFenceInCallout: Story = {
  name: 'callout 안 code fence 뒤의 블록 표시도 callout 전체를 anchor로 만든다',
  tags: ['!dev'],
  args: { body: ['> [!example] 문법', '>', '> ```ts', '> const a = 1;', '> ```', '>^b33468'].join('\n') },
  play: async ({ canvasElement }) => {
    const callout = canvasElement.querySelector('#block-b33468');

    await expect(callout?.textContent).toContain('문법');
    await expect(callout?.textContent).toContain('const a = 1;');
  },
};

export const FoldedCallout: Story = {
  name: '접힌 callout은 닫힌 details로 그리고 type label과 제목을 summary에 둔다',
  tags: ['!dev'],
  args: { body: ['> [!info]- 먼저 알아 둘 용어', '> - **SNI**: 도메인 이름을 함께 보내는 기능'].join('\n') },
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector('details');

    await expect(details?.open).toBe(false);
    await expect(details?.querySelector('summary')?.textContent).toBe('info먼저 알아 둘 용어');
    await expect(canvasElement.textContent).not.toContain('[!info]');
  },
};

export const OpenCallout: Story = {
  name: '`+` callout은 열린 details로 그린다',
  tags: ['!dev'],
  args: { body: ['> [!tip]+ 캐시 비우기', '> 배포 뒤에 비운다.'].join('\n') },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('details')?.open).toBe(true);
  },
};

export const StaticCallout: Story = {
  name: '접기 표시가 없는 callout은 접을 수 없는 블록으로 그린다',
  tags: ['!dev'],
  args: { body: ['> [!note] 재시도 정책', '> 재시도는 지수 백오프로 한다.'].join('\n') },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('details')).toBe(null);
    await expect(canvasElement.querySelector('blockquote')).toBe(null);
    await expect(canvas.getByText('재시도는 지수 백오프로 한다.')).toBeDefined();
  },
};

const CALLOUT_COLOR_BODIES = ['> [!error] 실패', '> [!faq] 질문', '> [!constructor] 모르는 type'];

/** 본문마다 따로 그린 `Markdown`에서 첫 callout 선의 class를 읽는다. */
export const CalloutColorGroups: Story = {
  name: 'callout 선 색은 type 별칭과 모르는 type을 묶음으로 나눈다',
  tags: ['!dev'],
  render: () => (
    <>
      {CALLOUT_COLOR_BODIES.map((body) => (
        <Markdown key={body} body={body} />
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    const articles = [...(canvasElement.firstElementChild?.children ?? [])];
    const [error, faq, unknown] = articles.map((article) => article.querySelector('.border-l-2')?.className);

    await expect(error).toContain('border-caution');
    await expect(faq).toContain('border-accent-strong');
    await expect(unknown).toContain('border-text-muted');
  },
};

export const BlockReferenceLink: Story = {
  name: '같은 노트 block reference는 그 anchor로 가는 링크가 된다',
  tags: ['!dev'],
  args: { body: ['- [[#^c58057|의존성 배열]]', '', '> 인용한 문장', '> ^c58057'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '의존성 배열' }).getAttribute('href')).toBe('#block-c58057');
  },
};

export const MissingBlockReference: Story = {
  name: '본문에 없는 block을 가리키는 참조는 unresolved로 둔다',
  tags: ['!dev'],
  args: { body: '- [[#^c58057|의존성 배열]]' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: '의존성 배열' })).toBe(null);
    await expect(canvas.getByTitle('의존성 배열 — no note yet')).toBeDefined();
  },
};

export const BlockMarkInTightList: Story = {
  name: 'tight list 항목 끝의 블록 표시는 항목 자체를 anchor로 만든다',
  tags: ['!dev'],
  args: { body: ['- 첫 항목', '- 둘째 항목', '  ^e23126'].join('\n') },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('li#block-e23126')?.textContent).toBe('둘째 항목');
  },
};

export const BlockMarkAfterTable: Story = {
  name: '표 바로 뒤의 블록 표시는 표 전체를 anchor로 만든다',
  tags: ['!dev'],
  args: { body: ['| 칸 |', '| --- |', '| 값 |', '^c5ce9a'].join('\n') },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('#block-c5ce9a')?.querySelector('table')).not.toBe(null);
  },
};

export const BlockMarkInFence: Story = {
  name: 'code fence 안의 블록 표시는 원문 그대로 둔다',
  tags: ['!dev'],
  args: { body: ['```txt', '^c58057', '```'].join('\n') },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('^c58057')).toBeDefined();
  },
};

export const HeadingIdMatchesOutline: Story = {
  name: 'heading에 outline과 같은 id를 붙인다',
  tags: ['!dev'],
  args: { body: '# 설치 방법' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2 }).id).toBe(parseOutline('# 설치 방법')[0].id);
  },
};

/** 첨부 저장소를 옆의 `fixtures` 폴더로 둔다. dev 서버가 파일을 주므로 이미지 로드가 네트워크를 타지 않는다. */
const ATTACHMENT_BASE_URL = new URL('fixtures', import.meta.url).href;

const withAttachments: NonNullable<Story['decorators']> = [
  (Story) => (
    <AttachmentBaseUrlProvider baseUrl={ATTACHMENT_BASE_URL}>
      <Story />
    </AttachmentBaseUrlProvider>
  ),
];

export const VaultImagePath: Story = {
  // nocap: library-body-2
  name: 'vault 경로는 첨부 파일 저장소 주소로 바꾸고 다시 인코딩하지 않는다',
  tags: ['!dev'],
  decorators: withAttachments,
  args: { body: '![도식](att/my%20img.png)' },
  play: async ({ canvas }) => {
    const image = canvas.getByRole('img', { name: '도식' });

    await expect(image.getAttribute('src')).toBe(`${ATTACHMENT_BASE_URL}/vault/att/my%20img.png`);
    await expect(image.getAttribute('loading')).toBe('lazy');
  },
};

export const SchemeImagePath: Story = {
  name: 'scheme이 있는 주소는 그대로 쓴다',
  tags: ['!dev'],
  decorators: withAttachments,
  args: { body: `![외부](${ATTACHMENT_BASE_URL}/vault/att/a.png)` },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: '외부' }).getAttribute('src')).toBe(`${ATTACHMENT_BASE_URL}/vault/att/a.png`);
  },
};

export const ObsidianImageSize: Story = {
  name: 'Obsidian 크기 문법을 alt에서 떼어 폭과 높이로 쓴다',
  tags: ['!dev'],
  decorators: withAttachments,
  args: { body: ['![설명|300](att/a.png)', '', '![|300x200](att/b.png)'].join('\n') },
  play: async ({ canvasElement }) => {
    const [widthOnly, both] = canvasElement.querySelectorAll('img');

    await expect(widthOnly.getAttribute('alt')).toBe('설명');
    await expect(widthOnly.getAttribute('width')).toBe('300');
    await expect(widthOnly.getAttribute('height')).toBe(null);
    await expect(both.getAttribute('alt')).toBe('');
    await expect(both.getAttribute('width')).toBe('300');
    await expect(both.getAttribute('height')).toBe('200');
  },
};

export const ImageFallback: Story = {
  name: '로드에 실패하면 alt를 남긴 채 대체 이미지로 바꾼다',
  tags: ['!dev'],
  decorators: withAttachments,
  args: { body: '![도식|300](att/missing.png)' },
  play: async ({ canvas }) => {
    const image = canvas.getByRole('img', { name: '도식' });

    await waitFor(() => expect(image.getAttribute('src')).toBe(imageUnavailable));
    await expect(image.getAttribute('alt')).toBe('도식');
    await expect(image.getAttribute('width')).toBe('300');
  },
};

export const ImageFallbackWithoutAlt: Story = {
  name: 'alt가 없는 이미지가 실패하면 대체 이미지에 설명을 붙인다',
  tags: ['!dev'],
  decorators: withAttachments,
  args: { body: '![](att/missing.png)' },
  play: async ({ canvas }) => {
    const image = await canvas.findByRole('img', { name: 'Image unavailable' });

    await expect(image.getAttribute('src')).toBe(imageUnavailable);
  },
};

const SECTIONED = [
  '머리말',
  '',
  '# 서버',
  '',
  '서버 본문',
  '',
  '## 후보',
  '',
  '후보 본문',
  '',
  '##### 메모',
  '',
  '메모 본문',
  '',
  '# 다음',
  '',
  '다음 본문',
].join('\n');

function sectionsOf(canvas: Canvas) {
  const heading = (name: string) => canvas.getByRole('heading', { name });
  const section = (name: string) => heading(name).closest('section');
  const isFocused = (name: string) => section(name)?.hasAttribute('data-focus');

  return { heading, section, isFocused };
}

export const SectionGrouping: Story = {
  name: '제목부터 같은 단계 이하의 다음 제목 전까지를 section으로 묶는다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, canvasElement }) => {
    const { section } = sectionsOf(canvas);
    const article = articleOf(canvasElement);

    await expect([...(article?.children ?? [])].map((child) => child.tagName)).toEqual(['P', 'SECTION', 'SECTION']);
    await expect(section('후보')?.parentElement).toBe(section('서버'));
    await expect(canvas.getByText('메모 본문').closest('section')).toBe(section('후보'));
  },
};

/** 고정만 보도록 click 전에 pointer를 옮기지 않는다. 옮기면 hover 미리 보기가 고정보다 앞선다. */
export const SectionPinMoves: Story = {
  name: '제목을 누르면 그 섹션을 고정하고, 다른 제목을 누르면 고정을 옮긴다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const user = userEvent.setup({ skipHover: true });
    const { heading, isFocused } = sectionsOf(canvas);

    await user.click(heading('서버'));
    await expect(isFocused('서버')).toBe(true);
    await expect(articleOf(canvasElement)?.hasAttribute('data-focusing')).toBe(true);

    await user.click(heading('다음'));
    await expect(isFocused('서버')).toBe(false);
    await expect(isFocused('다음')).toBe(true);
  },
};

export const SectionPinReleases: Story = {
  name: '같은 제목을 다시 누르거나, 제목 밖을 누르거나, Esc를 누르면 풀린다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const user = userEvent.setup({ skipHover: true });
    const { heading } = sectionsOf(canvas);
    const article = articleOf(canvasElement);

    await user.click(heading('서버'));
    await user.click(heading('서버'));
    await expect(article?.hasAttribute('data-focusing')).toBe(false);

    await user.click(heading('서버'));
    await user.click(document.body);
    await expect(article?.hasAttribute('data-focusing')).toBe(false);

    await user.click(heading('서버'));
    await user.keyboard('{Escape}');
    await expect(article?.hasAttribute('data-focusing')).toBe(false);
  },
};

export const SectionPinSurvivesSelection: Story = {
  name: '글자를 드래그해 선택한 채 끝난 click은 고정을 풀지 않는다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, userEvent }) => {
    const user = userEvent.setup({ skipHover: true });
    const { heading, isFocused } = sectionsOf(canvas);
    await user.click(heading('서버'));

    const text = canvas.getByText('서버 본문');
    await user.pointer([{ keys: '[MouseLeft>]', target: text, offset: 0 }, { offset: 5 }, { keys: '[/MouseLeft]' }]);
    window.getSelection()?.removeAllRanges();

    await expect(isFocused('서버')).toBe(true);
  },
};

const NEXT_HEADING_ID = parseOutline(SECTIONED).find(({ text }) => text === '다음')?.id ?? '';

export const SectionPinFromOutside: Story = {
  name: '본문 밖의 고정 요청 링크를 누르면 그 제목의 섹션을 고정한다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  render: (args) => (
    <>
      <Markdown {...args} />
      <a {...pinSectionOnClick(NEXT_HEADING_ID)}>근거</a>
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const user = userEvent.setup({ skipHover: true });
    const { heading, isFocused } = sectionsOf(canvas);
    await user.click(heading('서버'));

    await user.click(canvas.getByText('근거'));

    await expect(heading('다음').id).toBe(NEXT_HEADING_ID);
    await expect(isFocused('다음')).toBe(true);
    await expect(isFocused('서버')).toBe(false);
  },
};

export const SectionHoverPreview: Story = {
  name: '마우스 hover는 고정보다 앞서 미리 보이고, 본문을 벗어나면 고정으로 돌아온다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, userEvent }) => {
    const user = userEvent.setup({ skipHover: true });
    const { heading, isFocused } = sectionsOf(canvas);
    await user.click(heading('서버'));

    await user.hover(heading('다음'));
    await waitFor(() => expect(isFocused('다음')).toBe(true));
    await expect(isFocused('서버')).toBe(false);

    await user.unhover(heading('다음'));
    await waitFor(() => expect(isFocused('서버')).toBe(true));
  },
};

export const SectionTouchIsNotPreview: Story = {
  name: '터치의 pointerover는 미리 보기로 보지 않는다',
  tags: ['!dev'],
  args: { body: SECTIONED },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const { heading } = sectionsOf(canvas);

    await userEvent.pointer({ keys: '[TouchA>]', target: heading('다음') });

    await expect(articleOf(canvasElement)?.hasAttribute('data-focusing')).toBe(false);
  },
};
