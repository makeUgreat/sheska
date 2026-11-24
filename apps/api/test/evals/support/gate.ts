export interface GateResult {
  readonly passed: boolean;
  readonly explanation: string;
}

export interface Gate<TInput> {
  readonly name: string;
  judge(input: TInput): GateResult;
}
