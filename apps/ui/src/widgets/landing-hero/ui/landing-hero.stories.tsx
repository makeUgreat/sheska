import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LandingHero } from './landing-hero';

const meta = {
  title: 'Widgets/LandingHero',
  component: LandingHero,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => {
    const [query, setQuery] = useState(args.query);

    return <LandingHero {...args} query={query} onQueryChange={setQuery} />;
  },
  args: {
    query: '',
    onQueryChange: () => undefined,
    totalPostCount: 42,
    articlesHref: '/posts',
  },
} satisfies Meta<typeof LandingHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearchQuery: Story = {
  args: {
    query: 'storybook',
  },
};
