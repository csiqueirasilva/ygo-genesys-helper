export function normalizeCardName(name: string): string {
  return name
    .trim()
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
