import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AboutPage } from './about-page';
import { ServicePage } from './service-page';

const withAboutRoutes: Decorator = (Story) => (
  <MemoryRouter initialEntries={['/about']}>
    <Routes>
      <Route path="/about" element={<Story />} />
      <Route path="/about/:slug" element={<ServicePage />} />
    </Routes>
  </MemoryRouter>
);

const meta = {
  title: 'Pages/About/AboutPage',
  component: AboutPage,
  decorators: [withAboutRoutes],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AboutPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CardLinkNamesOnlyTheService: Story = {
  name: '카드 링크는 서비스 이름으로만 읽힌다',
  tags: ['!dev'],
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole('link');

    await expect(links.map((link) => link.textContent)).toEqual(['Sheska', 'Siru', 'Nocap', 'Home Cluster']);
    await expect(canvas.getByRole('link', { name: 'Nocap' })).toHaveAttribute('href', '/about/nocap');
  },
};

export const SummaryClickOpensService: Story = {
  name: '카드의 요약 자리를 눌러도 그 서비스 링크가 눌린다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const summary = canvas.getByText(/아직 검증되지 않은 명세를 찾습니다/);
    summary.scrollIntoView({ block: 'center' });
    const { x, y, width, height } = summary.getBoundingClientRect();
    const hit = document.elementFromPoint(x + width / 2, y + height / 2);

    await expect(hit).toBe(canvas.getByRole('link', { name: 'Nocap' }));

    await userEvent.click(hit as Element);

    await expect(await canvas.findByRole('heading', { level: 1, name: 'Nocap' })).toBeVisible();
    await expect(canvas.getByText('아직 준비 중입니다.')).toBeVisible();
  },
};
