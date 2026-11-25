export interface GateResult {
  readonly passed: boolean;
  readonly explanation: string;
}

export interface Gate<TInput> {
  readonly name: string;
  judge(input: TInput): GateResult;
}

export interface GateFailure {
  /** 실패한 게이트의 name */
  readonly gate: string;
  readonly explanation: string;
}
