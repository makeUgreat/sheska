import { trace } from '@opentelemetry/api';
import { tracing } from '@opentelemetry/sdk-node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type CallContext } from '@core/call-context';
import { BadResponseError, InputTooLargeError, InvalidDataError, TimeoutError, UnavailableError } from '@core/errors';
import { TextAnthropicGenerator } from '../text.anthropic.generator';

const REQUEST = { instructions: '<role>요약 도구</role>', input: '<post>본문</post>', maxOutputTokens: 2_048 };

describe('TextAnthropicGenerator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('지침은 system, 입력은 user 메시지로 보내고 SDK 재시도는 끈다', async () => {
    const fetchMock = stubFetch(() => messageResponse());

    await createGenerator().generate(REQUEST, buildContext());

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 2_048,
      system: '<role>요약 도구</role>',
      messages: [{ role: 'user', content: '<post>본문</post>' }],
      output_config: { effort: 'low' },
    });
    expect(new Headers(init.headers).get('x-stainless-retry-count')).toBe('0');
  });

  it('text block만 이어 붙이고 thinking block은 버리며 응답한 모델을 돌려준다', async () => {
    stubFetch(() =>
      messageResponse({
        model: 'claude-haiku-5-5-20261101',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'text', text: '<sentence>첫 문장임</sentence>' },
          { type: 'text', text: '<sentence>둘째 문장임</sentence>' },
        ],
      }),
    );

    const result = await createGenerator().generate(REQUEST, buildContext());

    expect(result).toEqual({
      text: '<sentence>첫 문장임</sentence><sentence>둘째 문장임</sentence>',
      model: 'claude-haiku-5-5-20261101',
      finishReason: 'completed',
    });
  });

  it.each([
    { stopReason: 'end_turn', finishReason: 'completed' },
    { stopReason: 'stop_sequence', finishReason: 'completed' },
    { stopReason: 'max_tokens', finishReason: 'truncated' },
    { stopReason: 'model_context_window_exceeded', finishReason: 'truncated' },
    { stopReason: 'refusal', finishReason: 'refused' },
  ])('stop_reason $stopReason을 $finishReason으로 바꾼다', async ({ stopReason, finishReason }) => {
    stubFetch(() => messageResponse({ stop_reason: stopReason }));

    const result = await createGenerator().generate(REQUEST, buildContext());

    expect(result.finishReason).toBe(finishReason);
  });

  it.each(['tool_use', 'pause_turn', null])('도구 없이 나올 수 없는 stop_reason %j이면 InvalidDataError를 던진다', async (stopReason) => {
    stubFetch(() => messageResponse({ stop_reason: stopReason }));

    await expect(createGenerator().generate(REQUEST, buildContext())).rejects.toThrow(InvalidDataError);
  });

  it.each([
    { name: '413', status: 413, message: 'Request exceeds the maximum allowed number of bytes' },
    { name: 'prompt is too long인 400', status: 400, message: 'prompt is too long: 1200000 tokens > 1000000 maximum' },
  ])('$name 응답은 InputTooLargeError로 바꾼다', async ({ status, message }) => {
    stubFetch(() => errorResponse(status, message));

    await expect(createGenerator().generate(REQUEST, buildContext())).rejects.toThrow(InputTooLargeError);
  });

  it('다른 이유의 400 응답은 다시 시도하지 않는 BadResponseError로 바꾼다', async () => {
    const fetchMock = stubFetch(() => errorResponse(400, 'max_tokens: must be positive'));

    await expect(createGenerator().generate(REQUEST, buildContext(60_000, 2))).rejects.toMatchObject({
      kind: 'bad_response',
      details: { statusCode: 400 },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('429 응답은 retry-after를 담은 BadResponseError로 바꾼다', async () => {
    stubFetch(() => errorResponse(429, 'rate limited', { 'retry-after': '3' }));

    await expect(createGenerator().generate(REQUEST, buildContext())).rejects.toMatchObject({
      kind: 'bad_response',
      details: { statusCode: 429, retryAfterMs: 3_000 },
    });
  });

  it('529 응답 뒤 재시도 예산만큼 한 번 더 시도한다', async () => {
    const fetchMock = stubFetch((call) => (call === 1 ? errorResponse(529, 'overloaded') : messageResponse()));

    const result = await createGenerator().generate(REQUEST, buildContext(60_000, 1));

    expect(result.finishReason).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('재시도 예산이 0이면 529 응답을 그대로 BadResponseError로 던진다', async () => {
    const fetchMock = stubFetch(() => errorResponse(529, 'overloaded'));

    await expect(createGenerator().generate(REQUEST, buildContext(60_000, 0))).rejects.toThrow(BadResponseError);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('연결하지 못하면 UnavailableError를 던진다', async () => {
    stubFetch(() => Promise.reject(new TypeError('fetch failed')));

    await expect(createGenerator().generate(REQUEST, buildContext())).rejects.toThrow(UnavailableError);
  });

  it('deadline 안에 응답이 없으면 TimeoutError를 던진다', async () => {
    stubFetch(
      (_call, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    await expect(createGenerator().generate(REQUEST, buildContext(50, 0))).rejects.toThrow(TimeoutError);
  });

  it('지침, 입력, 응답 내용을 호출 span에 남긴다', async () => {
    const exporter = new tracing.InMemorySpanExporter();
    const provider = new tracing.BasicTracerProvider({ spanProcessors: [new tracing.SimpleSpanProcessor(exporter)] });
    trace.setGlobalTracerProvider(provider);
    stubFetch(() => messageResponse());

    try {
      await createGenerator().generate(REQUEST, buildContext());
      await provider.forceFlush();
    } finally {
      trace.disable();
    }

    const [span] = exporter.getFinishedSpans();
    expect(span.attributes).toMatchObject({
      'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: '<role>요약 도구</role>' }]),
      'gen_ai.input.messages': JSON.stringify([{ role: 'user', parts: [{ type: 'text', content: '<post>본문</post>' }] }]),
    });
    expect(span.attributes['gen_ai.output.messages']).toContain('<sentence>요약 문장임</sentence>');
  });
});

function createGenerator(): TextAnthropicGenerator {
  return new TextAnthropicGenerator({ apiKey: 'test-key' }, { model: 'claude-haiku-5-5', effort: 'low' });
}

function buildContext(remainingMs = 60_000, maxRetries = 0): CallContext {
  return { deadline: computeDeadline(remainingMs), maxRetries };
}

function stubFetch(respond: (call: number, init: RequestInit) => Response | Promise<Response>) {
  let call = 0;
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    call += 1;
    return Promise.resolve(respond(call, init));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function messageResponse(overrides: Record<string, unknown> = {}): Response {
  return Response.json({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{ type: 'text', text: '<sentence>요약 문장임</sentence>' }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
    ...overrides,
  });
}

function errorResponse(status: number, message: string, headers: Record<string, string> = {}): Response {
  return Response.json(
    { type: 'error', error: { type: status === 400 ? 'invalid_request_error' : 'api_error', message } },
    { status, headers: { 'request-id': 'req_1', ...headers } },
  );
}
