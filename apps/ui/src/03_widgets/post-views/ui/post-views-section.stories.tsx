import type { Meta, StoryObj } from '@storybook/react-vite';
import { type PostView } from '@/entities/post';
import { HttpError } from '@/shared/api';
import { PostViewsSection } from './post-views-section';

function at(day: number, hours: number, minutes: number) {
  return new Date(2026, 10, day, hours, minutes).toISOString();
}

const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const views: PostView[] = [
  { viewedAt: at(21, 14, 5), ip: '203.0.113.24', client: MAC_CHROME },
  {
    viewedAt: at(21, 13, 31),
    ip: '198.51.100.7',
    client:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  },
  { viewedAt: at(21, 13, 2), ip: '203.0.113.24', client: MAC_CHROME },
  { viewedAt: at(21, 11, 48), ip: '192.0.2.15', client: 'unknown' },
  {
    viewedAt: at(21, 9, 12),
    ip: '66.249.66.1',
    client:
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.0.0 Safari/537.36',
  },
  {
    viewedAt: at(20, 22, 40),
    ip: '198.51.100.42',
    client: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  },
];

const meta = {
  title: 'Widgets/PostViews/PostViewsSection',
  component: PostViewsSection,
} satisfies Meta<typeof PostViewsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { state: { status: 'success', views, hasNextPage: false, sentinelRef: null } },
};

export const MorePages: Story = {
  args: { state: { status: 'success', views, hasNextPage: true, sentinelRef: null } },
};

export const Empty: Story = {
  args: { state: { status: 'empty' } },
};

export const Unauthorized: Story = {
  args: { state: { status: 'error', error: new HttpError(401, 'Unauthorized') } },
};
