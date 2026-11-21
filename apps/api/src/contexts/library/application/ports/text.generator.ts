import { type CallContext } from '@core/call-context';

export interface TextGenerationRequest {
  readonly instructions: string;
  /** 이번 호출에서 모델이 처리할 입력 */
  readonly input: string;
  /** 추론 토큰을 포함해 생성하는 모든 토큰의 상한 */
  readonly maxOutputTokens: number;
}

/**
 * - `completed`: 모델이 응답을 스스로 끝냄
 * - `truncated`: `maxOutputTokens`에 닿아 응답이 잘림
 * - `refused`: 모델이 안전 정책으로 응답을 거부함
 */
export type TextGenerationFinishReason = 'completed' | 'truncated' | 'refused';

export interface TextGenerationResult {
  /** 모델이 쓴 최종 응답. 추론 내용은 포함하지 않는다 */
  readonly text: string;
  /** 실제로 응답한 모델 이름 */
  readonly model: string;
  readonly finishReason: TextGenerationFinishReason;
}

export interface TextGenerator {
  /** 입력이 모델의 한도를 넘으면 자르지 않고 `InputTooLargeError`를 던진다 */
  generate(request: TextGenerationRequest, context: CallContext): Promise<TextGenerationResult>;
}
