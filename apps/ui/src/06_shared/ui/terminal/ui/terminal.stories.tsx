import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRef } from 'react';
import { expect, fireEvent, fn, waitFor, within } from 'storybook/test';
import { type TerminalCommand, type TerminalHandle } from '../model/types';
import { Terminal, type TerminalProps } from './terminal';
import { TerminalText } from './terminal-output';

const echoCommand: TerminalCommand = {
  name: 'echo',
  usage: 'echo <words>',
  summary: 'print words',
  run: (args, io) => io.print(<TerminalText>{args.join(' ')}</TerminalText>),
  complete: () => ['alpha', 'alpine'],
};

const hiddenCommand: TerminalCommand = {
  name: 'secret',
  summary: 'hidden',
  hidden: true,
  run: (_args, io) => io.print(<TerminalText>found</TerminalText>),
};

const meta = {
  title: 'Shared/Terminal',
  component: Terminal,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-96 max-w-container-terminal rounded-xl bg-surface p-4 font-mono text-display-terminal-mobile text-on-surface sm:p-6 sm:text-display-terminal">
        <Story />
      </div>
    ),
  ],
  args: {
    commands: [echoCommand],
    prompt: { identity: 'guest@hash', rest: ':~$' },
    className: 'h-full',
  },
} satisfies Meta<typeof Terminal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RunsTypedCommand: Story = {
  name: '입력한 명령을 프롬프트와 함께 남기고 실행한다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'echo hi there{Enter}');

    await expect(within(log).getByText('echo hi there')).toBeDefined();
    await expect(within(log).getByText('hi there')).toBeDefined();
  },
};

export const HelpHidesHiddenCommands: Story = {
  name: 'help는 숨긴 명령을 빼고 사용법과 설명을 보인다',
  tags: ['!dev'],
  args: { commands: [echoCommand, hiddenCommand] },
  play: async ({ canvas, userEvent }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'help{Enter}');

    await expect(within(log).getByText(/echo <words>/)).toBeDefined();
    await expect(within(log).getByText('print words')).toBeDefined();
    await expect(within(log).queryByText(/secret/)).toBeNull();
  },
};

export const RunsHiddenCommandByName: Story = {
  name: '숨긴 명령도 이름을 치면 실행된다',
  tags: ['!dev'],
  args: { commands: [echoCommand, hiddenCommand] },
  play: async ({ canvas, userEvent }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'secret{Enter}');

    await expect(within(log).getByText('found')).toBeDefined();
  },
};

export const UnknownCommand: Story = {
  name: '없는 명령은 command not found를 알리고 help를 보인다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'redis 세션{Enter}');

    await expect(within(log).getByText('hash: command not found: redis')).toBeDefined();
    await expect(within(log).getByText('print words')).toBeDefined();
  },
};

export const ArrowUpRecallsHistory: Story = {
  name: '위 화살표로 이전 명령을 불러온다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('guest@hash:~$');

    await userEvent.type(input, 'echo one{Enter}');
    await userEvent.keyboard('{ArrowUp}');

    await expect(input.value).toBe('echo one');
  },
};

export const TabCompletesSingleMatch: Story = {
  name: 'Tab은 후보가 하나면 명령 이름을 채운다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('guest@hash:~$');

    await userEvent.type(input, 'ec{Tab}');

    await expect(input.value).toBe('echo ');
  },
};

export const TabCompletesCommonPrefix: Story = {
  name: 'Tab은 후보가 여럿이면 공통 앞부분까지 채운다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('guest@hash:~$');

    await userEvent.type(input, 'echo a{Tab}');

    await expect(input.value).toBe('echo alp');
  },
};

export const TabWhileComposing: Story = {
  name: 'IME 조합 중 Tab은 값을 바꾸지 않는다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('guest@hash:~$');

    await userEvent.type(input, 'echo a');
    await fireEvent.keyDown(input, { key: 'Tab', isComposing: true });

    await expect(input.value).toBe('echo a');
  },
};

export const ArrowUpWhileComposing: Story = {
  name: 'IME 조합 중 위 화살표는 값을 바꾸지 않는다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText<HTMLInputElement>('guest@hash:~$');

    await userEvent.type(input, 'echo one{Enter}echo t');
    await fireEvent.keyDown(input, { key: 'ArrowUp', isComposing: true });

    await expect(input.value).toBe('echo t');
  },
};

export const CtrlLClears: Story = {
  name: 'Ctrl+L은 화면을 비운다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'echo hi{Enter}');
    await userEvent.keyboard('{Control>}l{/Control}');

    await expect(log.textContent).toBe('');
  },
};

function buildAskCommand(onAnswer: (answer: string) => void): TerminalCommand {
  return {
    name: 'su',
    summary: 'log in',
    run: async (_args, io) => {
      onAnswer(await io.ask('Password:', { secret: true }));
    },
  };
}

type AskStory = StoryObj<TerminalProps & { onAnswer: (answer: string) => void }>;

const renderAskCommand: AskStory['render'] = ({ onAnswer, ...args }) => <Terminal {...args} commands={[buildAskCommand(onAnswer)]} />;

export const AsksPasswordSecretly: AskStory = {
  name: 'password 칸으로 묻고 입력값을 화면과 기록에 남기지 않는다',
  tags: ['!dev'],
  args: { onAnswer: fn() },
  render: renderAskCommand,
  play: async ({ canvas, userEvent, args }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'su{Enter}');
    const password = await canvas.findByLabelText('Password:');
    await expect(password.getAttribute('type')).toBe('password');
    await expect(password.getAttribute('autocomplete')).toBe('current-password');

    await userEvent.type(password, 'hunter22{Enter}');
    await waitFor(() => expect(args.onAnswer).toHaveBeenCalledWith('hunter22'));
    await expect(log.textContent).not.toContain('hunter22');

    const prompt = await canvas.findByLabelText<HTMLInputElement>('guest@hash:~$');
    await userEvent.click(prompt);
    await userEvent.keyboard('{ArrowUp}');
    await expect(prompt.value).toBe('su');
  },
};

export const CtrlCStopsAsking: AskStory = {
  name: 'Ctrl+C는 질문을 멈추고 프롬프트로 돌아간다',
  tags: ['!dev'],
  args: { onAnswer: fn() },
  render: renderAskCommand,
  play: async ({ canvas, userEvent, args }) => {
    const log = canvas.getByRole('log');

    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'su{Enter}');
    await userEvent.type(await canvas.findByLabelText('Password:'), 'hun');
    await userEvent.keyboard('{Control>}c{/Control}');

    await expect(await canvas.findByLabelText('guest@hash:~$')).toBeDefined();
    await expect(log.textContent).toContain('^C');
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

let finishWaiting = () => {};

const waitCommand: TerminalCommand = {
  name: 'wait',
  summary: 'wait for a request',
  run: async (_args, io) => {
    io.progress('reading ~/posts');
    await new Promise<void>((resolve) => {
      finishWaiting = resolve;
    });
  },
};

export const ProgressWhileWaiting: Story = {
  name: '명령이 기다리는 동안 progress 글을 보이고 끝나면 지운다',
  tags: ['!dev'],
  args: { commands: [waitCommand] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('guest@hash:~$'), 'wait{Enter}');
    await expect((await canvas.findByRole('status')).textContent).toContain('reading ~/posts');

    finishWaiting();
    await waitFor(() => expect(canvas.queryByRole('status')).toBeNull());
  },
};

const terminal = createRef<TerminalHandle>();

export const RunFromHandle: Story = {
  name: 'run은 사용자가 입력한 것처럼 명령을 실행한다',
  tags: ['!dev'],
  render: (args) => <Terminal ref={terminal} {...args} />,
  play: async ({ canvas }) => {
    const log = canvas.getByRole('log');

    terminal.current?.run('echo from button');

    await expect(await within(log).findByText('from button')).toBeDefined();
  },
};
