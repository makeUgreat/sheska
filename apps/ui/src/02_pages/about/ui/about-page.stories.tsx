import type { Meta, StoryObj } from '@storybook/react-vite';
import { AboutPage } from './about-page';

const meta = {
  title: 'Pages/About/AboutPage',
  component: AboutPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AboutPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
