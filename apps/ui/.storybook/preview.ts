import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  /** Storybook은 story 링크를 부모 frame에서 열도록 `<base target="_parent">`를 둔다. 운영처럼 hash 링크가 자기 문서 안에서 움직이게 지운다. */
  beforeAll: () => {
    document.querySelector('base')?.removeAttribute('target');
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
