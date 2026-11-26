import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ServicePage } from './service-page';

const withServiceRoute: Decorator = (Story, { parameters }) => (
  <MemoryRouter initialEntries={[(parameters.path as string | undefined) ?? '/about/sheska']}>
    <Routes>
      <Route path="/about" element={<h1>About</h1>} />
      <Route path="/about/:slug" element={<Story />} />
    </Routes>
  </MemoryRouter>
);

const meta = {
  title: 'Pages/About/ServicePage',
  component: ServicePage,
  decorators: [withServiceRoute],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ServicePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpensServiceLinksInNewTab: Story = {
  name: '서비스 링크는 새 탭으로 연다',
  tags: ['!dev'],
  parameters: { path: '/about/nocap' },
  play: async ({ canvas }) => {
    const npm = canvas.getByRole('link', { name: /^npm/ });
    const github = canvas.getByRole('link', { name: /^GitHub/ });

    await expect(npm).toHaveAttribute('href', 'https://www.npmjs.com/package/@makehash/nocap');
    await expect(npm).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('href', 'https://github.com/makeUgreat/nocap');
    await expect(github).toHaveAttribute('target', '_blank');
  },
};

export const WithoutLinks: Story = {
  name: '링크가 없는 서비스는 체험 안내를 빼고 돌아가기만 둔다',
  parameters: { path: '/about/home-cluster' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/체험해 볼 수 있어요/)).not.toBeInTheDocument();
    await expect(canvas.getAllByRole('link').map((link) => link.textContent)).toEqual(['돌아가기']);
  },
};

export const BackLinkReturnsToAbout: Story = {
  name: '돌아가기를 누르면 about 페이지로 간다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: '돌아가기' }));

    await expect(await canvas.findByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  },
};

export const UnknownSlug: Story = {
  name: '없는 서비스 주소는 Not found를 보여 준다',
  parameters: { path: '/about/unknown' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Not found')).toBeVisible();
  },
};
