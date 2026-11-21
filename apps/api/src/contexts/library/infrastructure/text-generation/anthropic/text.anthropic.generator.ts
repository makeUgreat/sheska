import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  BadRequestError,
  ContentTooLargeError,
} from '@anthropic-ai/sdk';
import { type Message } from '@anthropic-ai/sdk/resources/messages';
import { BadResponseError, InputTooLargeError, InvalidDataError, TimeoutError, UnavailableError } from '@core/errors';
import { type CallContext } from '@core/call-context';
import { classifyInfrastructureRetry, parseRetryAfterMs, resiliencePipeline, type ResilienceAttempt } from '@kernels/infrastructure';
import {
  type TextGenerationFinishReason,
  type TextGenerationRequest,
  type TextGenerationResult,
  type TextGenerator,
} from '@contexts/library/application/ports';
import { type AnthropicConfig } from './anthropic.config';

const PROMPT_TOO_LONG_MESSAGE = 'prompt is too long';

export interface TextAnthropicGeneratorOptions {
  readonly model: 'claude-haiku-5-5' | 'claude-sonnet-5-5' | 'claude-opus-5-5';
  readonly effort: 'low' | 'medium' | 'high';
}

export class TextAnthropicGenerator implements TextGenerator {
  private readonly client: Anthropic;

  constructor(
    config: AnthropicConfig,
    private readonly options: TextAnthropicGeneratorOptions,
  ) {
    this.client = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });
  }

  async generate(request: TextGenerationRequest, context: CallContext): Promise<TextGenerationResult> {
    return resiliencePipeline()
      .retry({
        maxRetries: context.maxRetries,
        baseDelayMs: 500,
        maxDelayMs: 5_000,
        classify: classifyInfrastructureRetry,
      })
      .timeout({
        deadline: context.deadline,
        attemptTimeoutMs: 60_000,
      })
      .execute((attempt) => this.generateOnce(request, attempt));
  }

  private async generateOnce(request: TextGenerationRequest, attempt: ResilienceAttempt): Promise<TextGenerationResult> {
    let message: Message;

    try {
      message = await this.client.messages.create(
        {
          model: this.options.model,
          max_tokens: request.maxOutputTokens,
          system: request.instructions,
          messages: [{ role: 'user', content: request.input }],
          output_config: { effort: this.options.effort },
        },
        { signal: attempt.signal },
      );
    } catch (error: unknown) {
      throw TextAnthropicGenerator.toError(error, attempt);
    }

    return {
      text: message.content.map((block) => (block.type === 'text' ? block.text : '')).join(''),
      model: message.model,
      finishReason: TextAnthropicGenerator.toFinishReason(message.stop_reason),
    };
  }

  private static toFinishReason(stopReason: Message['stop_reason']): TextGenerationFinishReason {
    switch (stopReason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'completed';
      case 'max_tokens':
      case 'model_context_window_exceeded':
        return 'truncated';
      case 'refusal':
        return 'refused';
      case 'tool_use':
      case 'pause_turn':
      case null:
        throw new InvalidDataError({
          code: 'anthropic.unexpected_stop_reason',
          message: `Anthropic stopped for an unexpected reason: ${stopReason}`,
          details: { fields: ['stop_reason'] },
        });
    }
  }

  private static toError(error: unknown, attempt: ResilienceAttempt): Error {
    if (error instanceof APIUserAbortError || error instanceof APIConnectionTimeoutError) {
      return new TimeoutError({
        code: 'anthropic.request_timeout',
        message: 'Anthropic did not respond in time',
        details: { deadlineBound: attempt.deadlineBound },
        cause: error,
      });
    }

    if (error instanceof APIConnectionError) {
      return new UnavailableError({
        code: 'anthropic.request_failed',
        message: 'Anthropic API is unavailable',
        details: {},
        cause: error,
      });
    }

    if (TextAnthropicGenerator.isInputTooLarge(error)) {
      return new InputTooLargeError({
        code: 'anthropic.input_too_large',
        message: 'Input exceeds what the Anthropic model can take',
        details: { statusCode: error.status },
        cause: error,
      });
    }

    if (error instanceof APIError && error.status !== undefined) {
      const { status, headers } = error as APIError<number, Headers>;

      return new BadResponseError({
        code: 'anthropic.bad_response',
        message: `Anthropic returned an error response: ${status}`,
        details: {
          statusCode: status,
          retryAfterMs: parseRetryAfterMs(headers.get('retry-after')),
        },
        cause: error,
      });
    }

    return error instanceof Error ? error : new Error(String(error));
  }

  private static isInputTooLarge(error: unknown): error is ContentTooLargeError | BadRequestError {
    if (error instanceof ContentTooLargeError) return true;

    return error instanceof BadRequestError && (error.apiMessage?.startsWith(PROMPT_TOO_LONG_MESSAGE) ?? false);
  }
}
