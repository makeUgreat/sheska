import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const REAL_CURSOR_EVENTS = [
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'mousemove',
];

/**
 * 테스트의 입력은 story가 보낸 이벤트뿐이어야 한다. headless browser에도 실제 커서가 있어서, 배치가 바뀌면
 * 멈춘 커서가 진짜 pointer 이벤트를 내고 story의 hover를 덮는다. Vitest로 돌 때만 진짜 이벤트를 막는다.
 */
function ignoreRealCursorInTests() {
  if (!('__vitest_browser__' in globalThis)) return undefined;

  const stop = (event: Event) => {
    if (event.isTrusted) event.stopImmediatePropagation();
  };
  REAL_CURSOR_EVENTS.forEach((type) => window.addEventListener(type, stop, true));
  return () => REAL_CURSOR_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
}

const preview: Preview = {
  /** Storybook은 story 링크를 부모 frame에서 열도록 `<base target="_parent">`를 둔다. 운영처럼 hash 링크가 자기 문서 안에서 움직이게 지운다. */
  beforeAll: () => {
    document.querySelector('base')?.removeAttribute('target');
    return ignoreRealCursorInTests();
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
