const BOX_WIDTH = 74;
const CONTENT_WIDTH = BOX_WIDTH - 4;

export interface IntegrationAdapterLogContext {
  readonly adapter: string;
  readonly boundary: string;
  readonly module: string;
  readonly target: string;
}

export function logIntegrationAdapterBanner(
  context: IntegrationAdapterLogContext,
): void {
  console.info(
    [
      '',
      horizontalRule(),
      boxLine('SHESKA INTEGRATION TEST ADAPTER'),
      boxLine(''),
      boxLine(`ADAPTER  : ${context.adapter}`),
      boxLine(`BOUNDARY : ${context.boundary}`),
      boxLine(`MODULE   : ${context.module}`),
      boxLine(`TARGET   : ${context.target}`),
      horizontalRule(),
    ].join('\n'),
  );
}

export function logIntegrationAdapterStep(
  context: IntegrationAdapterLogContext,
  status: 'START' | 'READY' | 'DONE',
  message: string,
): void {
  console.info(`[${context.adapter}] ${status.padEnd(5)} | ${message}`);
}

function horizontalRule(): string {
  return `+${'-'.repeat(BOX_WIDTH - 2)}+`;
}

function boxLine(value: string): string {
  const clippedValue =
    value.length > CONTENT_WIDTH ? value.slice(0, CONTENT_WIDTH) : value;

  return `| ${clippedValue.padEnd(CONTENT_WIDTH)} |`;
}
