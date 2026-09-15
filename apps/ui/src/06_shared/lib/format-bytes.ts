const UNITS = ['KB', 'MB', 'GB', 'TB'];
const DECIMAL_PLACES = 1;
const MIN_DISPLAY_VALUE = 0.1;

export function formatBytes(bytes: number): string {
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = Number(value.toFixed(DECIMAL_PLACES));
  const displayValue = bytes > 0 && rounded === 0 ? MIN_DISPLAY_VALUE : rounded;

  return `${displayValue.toFixed(DECIMAL_PLACES)} ${UNITS[unitIndex]}`;
}
