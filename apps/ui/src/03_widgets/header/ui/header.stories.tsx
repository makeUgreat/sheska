import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './header';

const meta = {
  title: 'Shared Layout/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

function atRoute(route: string) {
  return [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={[route]}>
        <div className="w-screen max-w-[1280px]">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ];
}

export const OnNotes: Story = { decorators: atRoute('/notes') };
export const OnPosts: Story = { decorators: atRoute('/posts') };
export const OnNoteDetail: Story = { decorators: atRoute('/notes/01932abc') };
export const OnSources: Story = { decorators: atRoute('/sources') };
