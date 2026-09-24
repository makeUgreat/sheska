import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './markdown';

/** 상세 화면의 본문은 읽기 컬럼 폭 안에 놓인다. 줄 길이와 넘침은 이 폭에서 봐야 의미가 있다. */
const meta = {
  title: 'Shared UI/Markdown',
  component: Markdown,
  tags: ['autodocs'],
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

export const Prose: Story = {
  args: {
    body: [
      '# 문서 제목',
      '',
      '본문 한 문단은 `text-body-md`와 보조 텍스트 색을 쓴다.',
      '',
      '## 목록',
      '',
      '- 첫 항목',
      '- 둘째 항목',
      '  - 중첩된 항목',
      '',
      '1. 순서 있는 첫 항목',
      '2. 순서 있는 둘째 항목',
      '',
      '> 인용은 accent 선으로 본문과 구분한다.',
      '',
      '---',
      '',
      '자세한 내용은 https://example.com/docs 를 본다.',
    ].join('\n'),
  },
};

export const LooseList: Story = {
  args: {
    body: ['- 빈 줄로 나뉜 항목', '', '- 같은 간격으로 보여야 한다'].join('\n'),
  },
};

export const TableAndCode: Story = {
  args: {
    body: [
      '| Option | Default |',
      '| --- | --- |',
      '| `retry` | 3 |',
      '| `timeout` | 30s |',
      '',
      '```ts',
      'const client = createClient({ retry: 3 });',
      '```',
      '',
      '- [x] 끝난 일',
      '- [ ] ~~폐기된~~ 남은 일',
    ].join('\n'),
  },
};

export const CodeFences: Story = {
  args: {
    body: [
      '등록한 언어는 token ink 네 단계로 나뉘고, 언어를 적지 않은 fence는 그대로 둔다.',
      '',
      '```ts',
      '// 재시도 횟수만 바꾼다',
      "import { createClient } from '@sheska/api';",
      '',
      'export async function loadPost(id: number) {',
      '  const client = createClient({ retry: 3 });',
      '  return client.get(`/posts/${id}`);',
      '}',
      '```',
      '',
      '```bash',
      '# 정적 검사를 한 번에 돌린다',
      'pnpm --filter @sheska/ui harness:static',
      '```',
      '',
      '```json',
      '{ "retry": 3, "timeout": "30s" }',
      '```',
      '',
      '```',
      'GET /posts/293 200 41ms',
      '```',
    ].join('\n'),
  },
};

/** Page 제목이 `<h1>`이므로 모든 heading이 한 단계씩 내려가고, `######`만 `#####`와 같은 `<h6>`에 남는다. */
export const Headings: Story = {
  args: {
    body: [
      '# 최상위 heading',
      '',
      '`#`은 `##`보다 한 단계 크게 그린다.',
      '',
      '## 섹션 heading',
      '',
      '### 셋째 단계',
      '',
      '#### 넷째 단계',
      '',
      '##### 다섯째 단계',
      '',
      '###### 여섯째 단계',
      '',
      '밑줄 표기 heading',
      '=================',
    ].join('\n'),
  },
};

export const InlineFormatting: Story = {
  args: {
    body: [
      '**굵게**, *기울임*, ***둘 다***, `inline code`, ~~취소선~~을 한 문단에 섞는다.',
      '',
      '[이름 붙인 링크](https://example.com)와 맨 URL https://example.com/docs 는 같은 링크 색을 쓴다.',
      '',
      'Vault는 Obsidian 문법이라 물결표 하나는 취소선이 아니다: 1~2장 그리고 3~4장.',
      '',
      '줄 끝에 공백 두 개를 두면  ',
      '줄바꿈이 된다.',
    ].join('\n'),
  },
};

/** 다른 노트를 가리키는 link는 API가 대상을 돌려주기 전까지 점선 밑줄의 unresolved로 남는다. */
export const WikiLinks: Story = {
  args: {
    body: [
      '[[feature-sliced-design]]처럼 label이 없으면 target을 그대로 보여준다.',
      '',
      '[[feature-sliced-design|FSD]]처럼 pipe 뒤에 label을 적으면 label만 보인다.',
      '',
      '[[feature-sliced-design#레이어 모델]]은 heading anchor를 떼고 노트 이름만 보인다.',
      '',
      '- **[[20260909153815|Dual Write Problem]]** 강조 안에 있어도 같다.',
      '',
      '| 노트 | 요약 |',
      '| --- | --- |',
      '| [[20260829133959\\|커널 스레드]] | 표 안에서는 pipe를 escape한다 |',
      '',
      'Embed ![[diagram.png]]는 아직 그리지 않아 원문으로 남고, `[[inline code]]` 안은 건드리지 않는다.',
    ].join('\n'),
  },
};

/** 같은 본문 안의 block을 가리키는 참조는 API 없이 그 block으로 이동하는 링크가 된다. */
export const BlockReferences: Story = {
  args: {
    body: [
      '- [[#^c58057|의존성 배열]]은 인용 전체로 간다.',
      '- [[#^e23126|둘째 항목]]은 목록 항목 하나로 간다.',
      '- [[#^a1b2c3|문단]]은 문단 하나로 간다.',
      '- [[#^missing|없는 block]]은 이동할 곳이 없어 unresolved로 남는다.',
      '',
      '> 의존성 배열이 바뀔 때만 effect가 다시 돈다.',
      '> ^c58057',
      '',
      '- 첫 항목',
      '- 둘째 항목 ^e23126',
      '',
      '표시는 본문에서 지워지고 이 문단의 anchor로 남는다. ^a1b2c3',
    ].join('\n'),
  },
};

/**
 * Callout 문법은 아직 해석하지 않아 인용으로 그리고, `[!note]` 표시와 제목은 첫 문단의 글자로 남는다.
 * 안의 목록과 code fence는 본문과 같은 규칙을 따른다.
 */
export const Callout: Story = {
  args: {
    body: [
      '> [!note] 재시도 정책',
      '> 재시도는 지수 백오프로 한다.',
      '>',
      '> - 첫 재시도는 1초 뒤',
      '> - 이후 두 배씩 늘린다',
      '>',
      '> ```ts',
      '> const delay = 2 ** attempt * 1000;',
      '> ```',
    ].join('\n'),
  },
};

/** 목록이나 callout 안에만 fence가 있어도 highlighter를 불러온다. */
export const NestedCodeFences: Story = {
  args: {
    body: [
      '1. 의존성을 설치한다.',
      '',
      '   ```bash',
      '   pnpm install',
      '   ```',
      '',
      '2. 설정을 바꾼다.',
      '',
      '   ```ts',
      '   export const retry = 3;',
      '   ```',
    ].join('\n'),
  },
};

/** 본문 폭을 넘는 내용이 페이지를 넓히지 않는지 본다. 긴 URL은 줄을 넘기고, 넓은 표는 칸 안에서 줄을 바꾸고, 긴 코드 줄은 코드 블록 안에서 가로로 스크롤한다. */
export const LongContent: Story = {
  args: {
    body: [
      '참고 문서: https://example.com/a/very/long/path/that/does/not/fit/in/the/reading/column/at/all?with=query&and=more',
      '',
      '| 설정 | 기본값 | 허용 범위 | 설명 | 적용 시점 | 비고 |',
      '| --- | --- | --- | --- | --- | --- |',
      '| `connectionTimeoutMilliseconds` | 30000 | 1000 ~ 120000 | 연결을 기다리는 최대 시간 | 재시작 후 | 운영 환경에서만 |',
      '',
      '```ts',
      "export const client = createClient({ baseUrl: 'https://api.example.com', retry: 3, timeout: 30_000, headers: { accept: 'application/json' } });",
      '```',
    ].join('\n'),
  },
};
