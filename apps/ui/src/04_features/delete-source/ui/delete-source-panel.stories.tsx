import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { DeleteSourcePanel } from './delete-source-panel';

type HttpCall = (path: string, ...rest: unknown[]) => Promise<unknown>;

const NEVER_SETTLES = () => new Promise<never>(() => undefined);

function withHttp(remove: HttpCall) {
  const http = { delete: remove } as unknown as HttpClient;

  return (Story: () => React.ReactElement) => (
    <HttpClientProvider client={http}>
      <Story />
    </HttpClientProvider>
  );
}

const meta = {
  title: 'Features/DeleteSource/DeleteSourcePanel',
  component: DeleteSourcePanel,
  args: { sourceId: 'source-1' },
  decorators: [
    withHttp(() => Promise.resolve(undefined)),
    (Story) => (
      <MemoryRouter initialEntries={['/sources/source-1']}>
        <QueryClientProvider client={new QueryClient()}>
          <Routes>
            <Route
              path="/sources/:id"
              element={
                <div className="w-72">
                  <Story />
                </div>
              }
            />
            <Route path="/sources" element={<h1>Sources</h1>} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof DeleteSourcePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

async function confirmDelete({ canvas, userEvent }: PlayContext) {
  await userEvent.click(canvas.getByRole('button', { name: 'Source 삭제' }));
  await userEvent.click(canvas.getByRole('button', { name: 'Source 삭제하기' }));
}

export const Idle: Story = {};

export const Confirming: Story = {
  name: 'Source 삭제를 누르면 지워지는 것을 알리고 한 번 더 묻는다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Source 삭제' }));

    const dialog = canvas.getByRole('alertdialog', { name: '이 source를 지울까요?' });
    await expect(dialog.textContent).toContain('되돌릴 수 없습니다');
    await expect(dialog.textContent).toContain('vault 노트는 그대로');
  },
};

export const Cancelled: Story = {
  name: '그만두기를 누르면 묻기 전으로 돌아간다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Source 삭제' }));
    await userEvent.click(canvas.getByRole('button', { name: '그만두기' }));

    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Source 삭제' })).toBeDefined();
  },
};

export const Deleting: Story = {
  name: '지우는 동안 두 버튼을 막는다',
  tags: ['!dev'],
  decorators: [withHttp(NEVER_SETTLES)],
  play: async (context) => {
    await confirmDelete(context);

    await expect(await context.canvas.findByRole('button', { name: '지우는 중...' })).toBeDisabled();
    await expect(context.canvas.getByRole('button', { name: '그만두기' })).toBeDisabled();
  },
};

const deleteSource = fn<HttpCall>(() => Promise.resolve(undefined));

export const Deleted: Story = {
  name: '지우면 source를 삭제하고 목록으로 돌아간다',
  tags: ['!dev'],
  decorators: [withHttp(deleteSource)],
  play: async (context) => {
    await confirmDelete(context);

    await expect(await context.canvas.findByRole('heading', { name: 'Sources' })).toBeDefined();
    await expect(deleteSource).toHaveBeenCalledWith('/sources/source-1');
  },
};

export const DeleteFailed: Story = {
  name: '지우지 못하면 알리고 다시 시도하게 한다',
  tags: ['!dev'],
  decorators: [withHttp(() => Promise.reject(new HttpError(503, 'Service Unavailable')))],
  play: async (context) => {
    await confirmDelete(context);

    await expect((await context.canvas.findByRole('alert')).textContent).toContain('source를 지우지 못했습니다.');
    await expect(context.canvas.getByRole('button', { name: '다시 시도' })).toBeDefined();
  },
};
