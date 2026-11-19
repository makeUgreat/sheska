export function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function commonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  return values.reduce((prefix, value) => {
    let length = 0;
    while (
      length < prefix.length &&
      length < value.length &&
      prefix[length] === value[length]
    ) {
      length += 1;
    }
    return prefix.slice(0, length);
  });
}
