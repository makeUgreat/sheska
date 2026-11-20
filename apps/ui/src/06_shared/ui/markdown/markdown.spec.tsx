import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactMarkdown from 'react-markdown';
import { MARKDOWN_PLUGINS, parseOutline } from '../../lib/markdown';
import { AttachmentBaseUrlProvider } from './attachment-base-url';
import imageUnavailable from './image-unavailable.svg';
import { Markdown } from './markdown';
import { MARKDOWN_COMPONENTS } from './markdown-components';
import { pinSectionOnClick } from './use-section-focus';

function renderBody(body: string) {
  return render(<Markdown body={body} />);
}

const ATTACHMENT_BASE_URL = 'https://files.example.com';

function renderWithAttachments(body: string) {
  return render(
    <AttachmentBaseUrlProvider baseUrl={ATTACHMENT_BASE_URL}>
      <Markdown body={body} />
    </AttachmentBaseUrlProvider>,
  );
}

describe('Markdown', () => {
  it('GFM 표 문법을 table로 렌더한다', () => {
    render(<Markdown body={['| Option | Default |', '| --- | --- |', '| retry | 3 |'].join('\n')} />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Option' })).toBeDefined();
    expect(within(table).getByRole('cell', { name: 'retry' })).toBeDefined();
  });

  it('취소선 문법을 del로 렌더한다', () => {
    render(<Markdown body="~~폐기된 방식~~을 더 쓰지 않는다" />);

    expect(screen.getByRole('deletion').textContent).toBe('폐기된 방식');
  });

  it('물결표 하나는 취소선으로 읽지 않는다', () => {
    render(<Markdown body="1~2장 그리고 3~4장" />);

    expect(screen.queryByRole('deletion')).toBe(null);
  });

  it('task list의 체크 상태를 그대로 보여준다', () => {
    render(<Markdown body={['- [x] 끝난 일', '- [ ] 남은 일'].join('\n')} />);

    const [done, todo] = screen.getAllByRole('checkbox');
    expect((done as HTMLInputElement).checked).toBe(true);
    expect((todo as HTMLInputElement).checked).toBe(false);
  });

  it('맨 URL을 링크로 만든다', () => {
    render(<Markdown body="참고: https://example.com/docs" />);

    expect(screen.getByRole('link', { name: 'https://example.com/docs' })).toBeDefined();
  });

  it('page 제목 아래에 놓이도록 heading을 한 단계씩 낮춘다', () => {
    render(<Markdown body={['# 하나', '## 둘', '### 셋', '#### 넷', '##### 다섯'].join('\n')} />);

    expect([2, 3, 4, 5, 6].map((level) => screen.getByRole('heading', { level }).textContent)).toEqual(['하나', '둘', '셋', '넷', '다섯']);
  });

  it('더 내려갈 단계가 없는 `######`은 h6에 둔다', () => {
    render(<Markdown body="###### 여섯" />);

    expect(screen.getByRole('heading', { level: 6 }).textContent).toBe('여섯');
  });
});

function fence(language: string, ...lines: string[]) {
  return ['```' + language, ...lines, '```'].join('\n');
}

/** Highlighter는 나중에 도착하므로 fence에 hljs class가 붙을 때까지 기다린다. */
async function renderFence(body: string) {
  const view = render(<Markdown body={body} />);

  await waitFor(() => expect(view.container.querySelector('.hljs')).not.toBe(null));
  return view;
}

describe('Markdown 코드 펜스', () => {
  it('fence에 적은 언어를 라벨로 보여준다', async () => {
    await renderFence(fence('ts', 'const retry = 3;'));

    expect(screen.getByText('ts')).toBeDefined();
  });

  it('언어를 적지 않은 fence는 text로 라벨을 단다', () => {
    render(<Markdown body={fence('', 'plain line')} />);

    expect(screen.getByText('text')).toBeDefined();
  });

  it('등록한 언어의 keyword를 highlight token으로 쪼갠다', async () => {
    const { container } = await renderFence(fence('ts', 'const retry = 3;'));

    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
  });

  it('목록 항목 안의 fence도 highlight한다', async () => {
    const { container } = await renderFence(['- 설정', '', '  ```ts', '  const retry = 3;', '  ```'].join('\n'));

    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
  });

  it('등록하지 않은 언어는 원문 그대로 둔다', async () => {
    const { container } = await renderFence(fence('brainfuck', '+[----->+++<]>+.'));

    expect(container.querySelector('.hljs-keyword')).toBe(null);
    expect(screen.getByText('+[----->+++<]>+.')).toBeDefined();
  });

  it('복사 버튼이 fence 원문을 클립보드에 넣는다', async () => {
    const user = userEvent.setup();
    await renderFence(fence('ts', 'const retry = 3;'));

    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(await navigator.clipboard.readText()).toBe('const retry = 3;\n');
  });

  it('복사한 뒤 결과를 status로 알린다', async () => {
    const user = userEvent.setup();
    await renderFence(fence('ts', 'const retry = 3;'));

    expect(screen.getByRole('status').textContent).toBe('');
    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect((await screen.findByRole('status')).textContent).toBe('Copied');
  });

  it('inline code에는 코드 블록 chrome을 붙이지 않는다', () => {
    render(<Markdown body="옵션은 `retry`다" />);

    expect(screen.queryByRole('button', { name: 'Copy code' })).toBe(null);
    expect(screen.getByText('retry').tagName).toBe('CODE');
  });
});

/** KaTeX는 나중에 도착하므로 수식에 katex class가 붙을 때까지 기다린다. */
async function renderMath(body: string) {
  const view = render(<Markdown body={body} />);

  await waitFor(() => expect(view.container.querySelector('.katex')).not.toBe(null));
  return view;
}

describe('Markdown 수식', () => {
  it('`$`로 감싼 글자를 inline 수식으로 그리고 `$`는 보이지 않는다', async () => {
    const { container } = await renderMath('관계 수는 $M:N$이다');

    expect(container.querySelector('.katex-display')).toBe(null);
    expect(container.textContent).not.toContain('$');
  });

  it('`$$` block을 display 수식으로 그린다', async () => {
    const { container } = await renderMath(['$$', 'N \\times M', '$$'].join('\n'));

    expect(container.querySelector('.katex-display')).not.toBe(null);
    expect(screen.queryByRole('button', { name: 'Copy code' })).toBe(null);
  });

  it('한 줄 `$$` 수식만 있는 문단을 display 수식으로 그린다', async () => {
    const { container } = await renderMath('$$N \\times M$$');

    expect(container.querySelector('.katex-display')).not.toBe(null);
  });

  it('한 번 받은 KaTeX는 다음 글의 첫 화면부터 쓴다', async () => {
    const first = await renderMath('$N$');
    first.unmount();

    const { container } = render(<Markdown body="$M$" />);

    expect(container.querySelector('.katex')).not.toBe(null);
  });

  it('잘못된 수식은 본문을 깨뜨리지 않고 원문을 남긴다', async () => {
    const { container } = render(<Markdown body={'앞 $\\frac{1$ 뒤'} />);

    await waitFor(() => expect(container.querySelector('.katex-error')?.textContent).toBe('\\frac{1'));
    expect(container.textContent).toContain('뒤');
  });
});

/** KaTeX를 받기 전의 화면은 rehype plugin 없이 그린 결과와 같다. */
function renderBeforeKatex(body: string) {
  return render(
    <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={MARKDOWN_PLUGINS}>
      {body}
    </ReactMarkdown>,
  );
}

describe('KaTeX가 도착하기 전의 수식', () => {
  it('inline 수식을 code 모양 없이 원문 글자로 둔다', () => {
    const { container } = renderBeforeKatex('관계 수는 $M:N$이다');

    expect(container.querySelector('code')).toBe(null);
    expect(container.textContent).toBe('관계 수는 M:N이다');
  });

  it('수식 block에 code fence의 언어 라벨과 복사 버튼을 붙이지 않는다', () => {
    const { container } = renderBeforeKatex(['$$', 'N \\times M', '$$'].join('\n'));

    expect(container.querySelector('pre')).toBe(null);
    expect(screen.queryByRole('button', { name: 'Copy code' })).toBe(null);
    expect(container.textContent).toBe('N \\times M');
  });
});

describe('Markdown vault 문법', () => {
  it('wiki link를 unresolved 표기로 바꾼다', () => {
    renderBody('[[feature-sliced-design|FSD]]를 따른다');

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('강조 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody('- **[[feature-sliced-design|FSD]]**');

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('표 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody(['| Note |', '| --- |', '| [[feature-sliced-design\\|FSD]] |'].join('\n'));

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('code fence 안의 wiki link 문법은 원문 그대로 둔다', () => {
    renderBody(['```txt', '[[feature-sliced-design|FSD]]', '```'].join('\n'));

    expect(screen.queryByTitle('FSD — no note yet')).toBe(null);
    expect(screen.getByText('[[feature-sliced-design|FSD]]')).toBeDefined();
  });

  it('블록 표시는 본문에 글자로 남기지 않는다', () => {
    renderBody(['인용 밖 문단', '', '^36406d'].join('\n'));

    expect(screen.queryByText(/\^36406d/)).toBe(null);
  });

  it('블록 표시는 바로 앞 블록을 anchor로 만든다', () => {
    renderBody(['인용 밖 문단', '', '^36406d'].join('\n'));

    expect(screen.getByText('인용 밖 문단').id).toBe('block-36406d');
  });

  it('인용 마지막 줄의 블록 표시는 인용 전체를 anchor로 만든다', () => {
    const { container } = renderBody(['> 인용한 문장', '> ^c58057'].join('\n'));

    expect(container.querySelector('blockquote')?.id).toBe('block-c58057');
  });

  it('callout 안 code fence 뒤의 블록 표시도 callout 전체를 anchor로 만든다', () => {
    const { container } = renderBody(['> [!example] 문법', '>', '> ```ts', '> const a = 1;', '> ```', '>^b33468'].join('\n'));

    const callout = container.querySelector('#block-b33468');
    expect(callout?.textContent).toContain('문법');
    expect(callout?.textContent).toContain('const a = 1;');
  });

  it('접힌 callout은 닫힌 details로 그리고 type label과 제목을 summary에 둔다', () => {
    const { container } = renderBody(['> [!info]- 먼저 알아 둘 용어', '> - **SNI**: 도메인 이름을 함께 보내는 기능'].join('\n'));

    const details = container.querySelector('details');
    expect(details?.open).toBe(false);
    expect(details?.querySelector('summary')?.textContent).toBe('info먼저 알아 둘 용어');
    expect(container.textContent).not.toContain('[!info]');
  });

  it('`+` callout은 열린 details로 그린다', () => {
    const { container } = renderBody(['> [!tip]+ 캐시 비우기', '> 배포 뒤에 비운다.'].join('\n'));

    expect(container.querySelector('details')?.open).toBe(true);
  });

  it('접기 표시가 없는 callout은 접을 수 없는 블록으로 그린다', () => {
    const { container } = renderBody(['> [!note] 재시도 정책', '> 재시도는 지수 백오프로 한다.'].join('\n'));

    expect(container.querySelector('details')).toBe(null);
    expect(container.querySelector('blockquote')).toBe(null);
    expect(screen.getByText('재시도는 지수 백오프로 한다.')).toBeDefined();
  });

  it('callout 선 색은 type 별칭과 모르는 type을 묶음으로 나눈다', () => {
    const colorOf = (body: string) => renderBody(body).container.querySelector('.border-l-2')?.className;

    expect(colorOf('> [!error] 실패')).toContain('border-caution');
    expect(colorOf('> [!faq] 질문')).toContain('border-accent-strong');
    expect(colorOf('> [!constructor] 모르는 type')).toContain('border-text-muted');
  });

  it('같은 노트 block reference는 그 anchor로 가는 링크가 된다', () => {
    renderBody(['- [[#^c58057|의존성 배열]]', '', '> 인용한 문장', '> ^c58057'].join('\n'));

    expect(screen.getByRole('link', { name: '의존성 배열' }).getAttribute('href')).toBe('#block-c58057');
  });

  it('본문에 없는 block을 가리키는 참조는 unresolved로 둔다', () => {
    renderBody('- [[#^c58057|의존성 배열]]');

    expect(screen.queryByRole('link', { name: '의존성 배열' })).toBe(null);
    expect(screen.getByTitle('의존성 배열 — no note yet')).toBeDefined();
  });

  it('tight list 항목 끝의 블록 표시는 항목 자체를 anchor로 만든다', () => {
    const { container } = renderBody(['- 첫 항목', '- 둘째 항목', '  ^e23126'].join('\n'));

    expect(container.querySelector('li#block-e23126')?.textContent).toBe('둘째 항목');
  });

  it('표 바로 뒤의 블록 표시는 표 전체를 anchor로 만든다', () => {
    const { container } = renderBody(['| 칸 |', '| --- |', '| 값 |', '^c5ce9a'].join('\n'));

    expect(container.querySelector('#block-c5ce9a')?.querySelector('table')).not.toBe(null);
  });

  it('code fence 안의 블록 표시는 원문 그대로 둔다', () => {
    renderBody(['```txt', '^c58057', '```'].join('\n'));

    expect(screen.getByText('^c58057')).toBeDefined();
  });

  it('heading에 outline과 같은 id를 붙인다', () => {
    renderBody('# 설치 방법');

    expect(screen.getByRole('heading', { level: 2 }).id).toBe(parseOutline('# 설치 방법')[0].id);
  });

  describe('이미지', () => {
    // nocap: library-body-2
    it('vault 경로는 첨부 파일 저장소 주소로 바꾸고 다시 인코딩하지 않는다', () => {
      renderWithAttachments('![도식](att/my%20img.png)');

      const image = screen.getByRole('img', { name: '도식' });
      expect(image.getAttribute('src')).toBe('https://files.example.com/vault/att/my%20img.png');
      expect(image.getAttribute('loading')).toBe('lazy');
    });

    it('scheme이 있는 주소는 그대로 쓴다', () => {
      renderWithAttachments('![외부](https://example.com/a.png)');

      expect(screen.getByRole('img', { name: '외부' }).getAttribute('src')).toBe('https://example.com/a.png');
    });

    it('Obsidian 크기 문법을 alt에서 떼어 폭과 높이로 쓴다', () => {
      const { container } = renderWithAttachments(['![설명|300](att/a.png)', '', '![|300x200](att/b.png)'].join('\n'));

      const [widthOnly, both] = container.querySelectorAll('img');
      expect(widthOnly.getAttribute('alt')).toBe('설명');
      expect(widthOnly.getAttribute('width')).toBe('300');
      expect(widthOnly.getAttribute('height')).toBe(null);
      expect(both.getAttribute('alt')).toBe('');
      expect(both.getAttribute('width')).toBe('300');
      expect(both.getAttribute('height')).toBe('200');
    });

    it('로드에 실패하면 alt를 남긴 채 대체 이미지로 바꾼다', () => {
      renderWithAttachments('![도식|300](att/missing.png)');

      const image = screen.getByRole('img', { name: '도식' });
      fireEvent.error(image);

      expect(image.getAttribute('src')).toBe(imageUnavailable);
      expect(image.getAttribute('alt')).toBe('도식');
      expect(image.getAttribute('width')).toBe('300');
    });

    it('alt가 없는 이미지가 실패하면 대체 이미지에 설명을 붙인다', () => {
      renderWithAttachments('![](att/missing.png)');

      fireEvent.error(screen.getByRole('presentation'));

      expect(screen.getByRole('img', { name: 'Image unavailable' }).getAttribute('src')).toBe(imageUnavailable);
    });
  });
});

describe('Markdown 섹션 강조', () => {
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

  const heading = (name: string) => screen.getByRole('heading', { name });

  const section = (name: string) => heading(name).closest('section');

  const isFocused = (name: string) => section(name)?.hasAttribute('data-focus');

  /** jsdom에는 PointerEvent가 없어서 fireEvent.pointerOver에 넘긴 pointerType이 사라진다. */
  const pointer = (type: 'pointerover' | 'pointerleave', target: Element, pointerType: string) =>
    fireEvent(target, Object.assign(new MouseEvent(type, { bubbles: type === 'pointerover' }), { pointerType }));

  it('제목부터 같은 단계 이하의 다음 제목 전까지를 section으로 묶는다', () => {
    const { container } = renderBody(SECTIONED);

    const article = container.firstElementChild;
    expect([...(article?.children ?? [])].map((child) => child.tagName)).toEqual(['P', 'SECTION', 'SECTION']);
    expect(section('후보')?.parentElement).toBe(section('서버'));
    expect(screen.getByText('메모 본문').closest('section')).toBe(section('후보'));
  });

  it('제목을 누르면 그 섹션을 고정하고, 다른 제목을 누르면 고정을 옮긴다', () => {
    const { container } = renderBody(SECTIONED);

    fireEvent.click(heading('서버'));
    expect(isFocused('서버')).toBe(true);
    expect(container.firstElementChild?.hasAttribute('data-focusing')).toBe(true);

    fireEvent.click(heading('다음'));
    expect(isFocused('서버')).toBe(false);
    expect(isFocused('다음')).toBe(true);
  });

  it('같은 제목을 다시 누르거나, 제목 밖을 누르거나, Esc를 누르면 풀린다', () => {
    const { container } = renderBody(SECTIONED);
    const article = container.firstElementChild;

    fireEvent.click(heading('서버'));
    fireEvent.click(heading('서버'));
    expect(article?.hasAttribute('data-focusing')).toBe(false);

    fireEvent.click(heading('서버'));
    fireEvent.click(document.body);
    expect(article?.hasAttribute('data-focusing')).toBe(false);

    fireEvent.click(heading('서버'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(article?.hasAttribute('data-focusing')).toBe(false);
  });

  it('글자를 드래그해 선택한 채 끝난 click은 고정을 풀지 않는다', () => {
    renderBody(SECTIONED);
    fireEvent.click(heading('서버'));

    const range = document.createRange();
    range.selectNodeContents(screen.getByText('서버 본문'));
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    fireEvent.click(screen.getByText('서버 본문'));
    window.getSelection()?.removeAllRanges();

    expect(isFocused('서버')).toBe(true);
  });

  it('본문 밖의 고정 요청 링크를 누르면 그 제목의 섹션을 고정한다', () => {
    renderBody(SECTIONED);
    render(<a {...pinSectionOnClick(heading('다음').id)}>근거</a>);
    fireEvent.click(heading('서버'));

    fireEvent.click(screen.getByText('근거'));

    expect(isFocused('다음')).toBe(true);
    expect(isFocused('서버')).toBe(false);
  });

  it('마우스 hover는 고정보다 앞서 미리 보이고, 본문을 벗어나면 고정으로 돌아온다', () => {
    const { container } = renderBody(SECTIONED);
    fireEvent.click(heading('서버'));

    pointer('pointerover', heading('다음'), 'mouse');
    expect(isFocused('다음')).toBe(true);
    expect(isFocused('서버')).toBe(false);

    pointer('pointerleave', container.firstElementChild as Element, 'mouse');
    expect(isFocused('서버')).toBe(true);
  });

  it('터치의 pointerover는 미리 보기로 보지 않는다', () => {
    const { container } = renderBody(SECTIONED);

    pointer('pointerover', heading('다음'), 'touch');

    expect(container.firstElementChild?.hasAttribute('data-focusing')).toBe(false);
  });
});
