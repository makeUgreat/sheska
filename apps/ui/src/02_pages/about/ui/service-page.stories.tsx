import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
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

export const ListsOnlyOtherServices: Story = {
  name: '다른 서비스 목록에는 지금 서비스가 빠진다',
  tags: ['!dev'],
  play: async ({ canvas }) => {
    const others = within(canvas.getByRole('navigation', { name: '다른 서비스' }));

    await expect(others.getAllByRole('link').map((link) => link.textContent)).toEqual(['Siru', 'Nocap', 'Home Cluster']);
  },
};

export const BackLinkReturnsToAbout: Story = {
  name: 'About으로 돌아가기를 누르면 about 페이지로 간다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: 'About으로 돌아가기' }));

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
