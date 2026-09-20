export interface HttpFailure<Code extends string = string, Details = unknown> {
  readonly statusCode: number;
  readonly code: Code;
  readonly message: string;
  readonly details: Details;
}
