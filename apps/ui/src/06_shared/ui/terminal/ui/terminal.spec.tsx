import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type TerminalCommand, type TerminalHandle } from '../model/types';
import { Terminal } from './terminal';
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

function renderTerminal(commands: TerminalCommand[] = [echoCommand]) {
  const ref = createRef<TerminalHandle>();
  render(<Terminal ref={ref} commands={commands} prompt={{ identity: 'visitor@hash', rest: ':~$' }} />);
  const log = screen.getByRole('log');
  return {
    ref,
    log,
    input: () => screen.getByLabelText(/visitor@hash|Password:/),
  };
}

describe('Terminal', () => {
  it('입력한 명령을 프롬프트와 함께 남기고 실행한다', async () => {
    const user = userEvent.setup();
    const { log } = renderTerminal();

    await user.type(screen.getByLabelText('visitor@hash:~$'), 'echo hi there{Enter}');

    expect(within(log).getByText('echo hi there')).toBeDefined();
    expect(within(log).getByText('hi there')).toBeDefined();
  });

  it('help는 숨긴 명령을 빼고 사용법과 설명을 보인다', async () => {
    const user = userEvent.setup();
    const { log } = renderTerminal([echoCommand, hiddenCommand]);

    await user.type(screen.getByLabelText('visitor@hash:~$'), 'help{Enter}');

    expect(within(log).getByText(/echo <words>/)).toBeDefined();
    expect(within(log).getByText('print words')).toBeDefined();
    expect(within(log).queryByText(/secret/)).toBeNull();
  });

  it('숨긴 명령도 이름을 치면 실행된다', async () => {
    const user = userEvent.setup();
    const { log } = renderTerminal([echoCommand, hiddenCommand]);

    await user.type(screen.getByLabelText('visitor@hash:~$'), 'secret{Enter}');

    expect(within(log).getByText('found')).toBeDefined();
  });

  it('없는 명령은 command not found를 알리고 help를 보인다', async () => {
    const user = userEvent.setup();
    const { log } = renderTerminal();

    await user.type(screen.getByLabelText('visitor@hash:~$'), 'redis 세션{Enter}');

    expect(within(log).getByText('hash: command not found: redis')).toBeDefined();
    expect(within(log).getByText('print words')).toBeDefined();
  });

  it('위 화살표로 이전 명령을 불러온다', async () => {
    const user = userEvent.setup();
    renderTerminal();
    const input = screen.getByLabelText('visitor@hash:~$');

    await user.type(input, 'echo one{Enter}');
    await user.keyboard('{ArrowUp}');

    expect((input as HTMLInputElement).value).toBe('echo one');
  });

  it('Tab은 후보가 하나면 명령 이름을 채운다', async () => {
    const user = userEvent.setup();
    renderTerminal();
    const input = screen.getByLabelText('visitor@hash:~$');

    await user.type(input, 'ec{Tab}');

    expect((input as HTMLInputElement).value).toBe('echo ');
  });

  it('Tab은 후보가 여럿이면 공통 앞부분까지 채운다', async () => {
    const user = userEvent.setup();
    renderTerminal();
    const input = screen.getByLabelText('visitor@hash:~$');

    await user.type(input, 'echo a{Tab}');

    expect((input as HTMLInputElement).value).toBe('echo alp');
  });

  it('IME 조합 중 Tab은 값을 바꾸지 않는다', async () => {
    const user = userEvent.setup();
    renderTerminal();
    const input = screen.getByLabelText('visitor@hash:~$');

    await user.type(input, 'echo a');
    fireEvent.keyDown(input, { key: 'Tab', isComposing: true });

    expect((input as HTMLInputElement).value).toBe('echo a');
  });

  it('IME 조합 중 위 화살표는 값을 바꾸지 않는다', async () => {
    const user = userEvent.setup();
    renderTerminal();
    const input = screen.getByLabelText('visitor@hash:~$');

    await user.type(input, 'echo one{Enter}echo t');
    fireEvent.keyDown(input, { key: 'ArrowUp', isComposing: true });

    expect((input as HTMLInputElement).value).toBe('echo t');
  });

  it('Ctrl+L은 화면을 비운다', async () => {
    const user = userEvent.setup();
    const { log } = renderTerminal();

    await user.type(screen.getByLabelText('visitor@hash:~$'), 'echo hi{Enter}');
    await user.keyboard('{Control>}l{/Control}');

    expect(log.textContent).toBe('');
  });

  describe('비밀번호 질문', () => {
    function buildAskCommand(onAnswer: (answer: string) => void): TerminalCommand {
      return {
        name: 'su',
        summary: 'log in',
        run: async (_args, io) => {
          onAnswer(await io.ask('Password:', { secret: true }));
        },
      };
    }

    it('password 칸으로 묻고 입력값을 화면과 기록에 남기지 않는다', async () => {
      const user = userEvent.setup();
      const onAnswer = vi.fn();
      const { log } = renderTerminal([buildAskCommand(onAnswer)]);

      await user.type(screen.getByLabelText('visitor@hash:~$'), 'su{Enter}');
      const password = await screen.findByLabelText('Password:');
      expect(password.getAttribute('type')).toBe('password');
      expect(password.getAttribute('autocomplete')).toBe('current-password');

      await user.type(password, 'hunter22{Enter}');
      await waitFor(() => expect(onAnswer).toHaveBeenCalledWith('hunter22'));
      expect(log.textContent).not.toContain('hunter22');

      const prompt = await screen.findByLabelText('visitor@hash:~$');
      await user.click(prompt);
      await user.keyboard('{ArrowUp}');
      expect((prompt as HTMLInputElement).value).toBe('su');
    });

    it('Ctrl+C는 질문을 멈추고 프롬프트로 돌아간다', async () => {
      const user = userEvent.setup();
      const onAnswer = vi.fn();
      const { log } = renderTerminal([buildAskCommand(onAnswer)]);

      await user.type(screen.getByLabelText('visitor@hash:~$'), 'su{Enter}');
      await user.type(await screen.findByLabelText('Password:'), 'hun');
      await user.keyboard('{Control>}c{/Control}');

      expect(await screen.findByLabelText('visitor@hash:~$')).toBeDefined();
      expect(log.textContent).toContain('^C');
      expect(onAnswer).not.toHaveBeenCalled();
    });
  });

  it('run은 사용자가 입력한 것처럼 명령을 실행한다', async () => {
    const { ref, log } = renderTerminal();

    act(() => ref.current?.run('echo from button'));

    expect(await within(log).findByText('from button')).toBeDefined();
  });
});
