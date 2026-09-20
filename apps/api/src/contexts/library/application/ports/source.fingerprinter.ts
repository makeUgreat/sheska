export interface SourceFingerprinter {
  calculate(content: string): Promise<string>;
}
