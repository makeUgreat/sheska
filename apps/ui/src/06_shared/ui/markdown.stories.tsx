import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './markdown';

const meta = {
  title: 'Shared UI/Markdown',
  component: Markdown,
  tags: ['autodocs'],
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
