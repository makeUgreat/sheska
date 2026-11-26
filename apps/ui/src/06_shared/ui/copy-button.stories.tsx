import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, spyOn } from 'storybook/test';
import { CopyButton } from './copy-button';

const meta = {
  title: 'Shared/CopyButton',
  component: CopyButton,
  args: {
    value: '01JDQ7M3K9X2T4V8R6N5P0C1BZ',
    label: 'source id 복사',
  },
} satisfies Meta<typeof CopyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Copied: Story = {
  name: '값을 클립보드에 넣고 결과를 status로 알린다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const writeText = spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    await userEvent.click(canvas.getByRole('button', { name: 'source id 복사' }));

    await expect(writeText).toHaveBeenCalledWith('01JDQ7M3K9X2T4V8R6N5P0C1BZ');
    await expect((await canvas.findByRole('status')).textContent).toBe('복사했습니다');
  },
};

export const CopyFailed: Story = {
  name: '클립보드가 거부하면 실패를 status로 알린다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await userEvent.click(canvas.getByRole('button', { name: 'source id 복사' }));

    await expect(await canvas.findByText('복사하지 못했습니다')).toBeDefined();
  },
};
