export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthDay(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });
}

/** mono 메타 줄의 날짜다. 자리 수가 일정해서 줄을 이룬 숫자가 같은 폭을 쓴다. */
export function formatDottedDate(value: string) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}.${month}.${day}`;
}
