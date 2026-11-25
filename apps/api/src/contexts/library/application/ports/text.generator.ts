import { type CallContext } from '@core/call-context';
import { type TextGenerationFinishReason } from '@kernels/application';

export interface TextGenerationMessage {
  /**
   * - `user`: 모델에게 보내는 입력
   * - `assistant`: 모델이 앞서 쓴 응답
   */
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface TextGenerationRequest {
  readonly instructions: string;
  /** 대화 메시지. 시간 순서로, 마지막 원소가 가장 최근 메시지 */
  readonly input: readonly TextGenerationMessage[];
  /** 추론 토큰을 포함해 생성하는 모든 토큰의 상한 */
  readonly maxOutputTokens: number;
}

export interface TextGenerationResult {
  /** 모델이 쓴 최종 응답. 추론 내용은 포함하지 않는다 */
  readonly text: string;
  /** 실제로 응답한 모델 이름 */
  readonly model: string;
  readonly finishReason: TextGenerationFinishReason;
}

export interface TextGenerator {
  generate(request: TextGenerationRequest, context: CallContext): Promise<TextGenerationResult>;
}
