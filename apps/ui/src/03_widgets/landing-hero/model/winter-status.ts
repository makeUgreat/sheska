const CHRISTMAS_COUNTDOWN_DAYS = 100;
const DAY_MS = 86_400_000;

function countDaysToChristmas(today: Date) {
  const day = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const thisChristmas = Date.UTC(today.getFullYear(), 11, 25);
  const christmas = day > thisChristmas ? Date.UTC(today.getFullYear() + 1, 11, 25) : thisChristmas;

  return Math.round((christmas - day) / DAY_MS);
}

export function formatWinterStatus(today: Date, christmas: 'christmas' | 'xmas') {
  const days = countDaysToChristmas(today);
  if (days > CHRISTMAS_COUNTDOWN_DAYS) return 'long nights, warm tea';
  if (days === 0) return `merry ${christmas}`;
  if (days === 1) return `1 day to ${christmas}`;

  return `${days} days to ${christmas}`;
}

export function formatWinterGreeting(today: Date) {
  return countDaysToChristmas(today) > CHRISTMAS_COUNTDOWN_DAYS ? 'Stay warm.' : 'Merry Christmas.';
}
