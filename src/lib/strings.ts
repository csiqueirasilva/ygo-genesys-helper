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

export function formatCardTypeLabel(type?: string | null, race?: string | null): string {
  const baseType = type?.trim();
  const baseRace = race?.trim();
  const fallback = baseType ?? baseRace ?? 'Unknown Card Type';

  if (!baseType) {
    return fallback;
  }

  const typeLower = baseType.toLowerCase();
  const raceLower = (baseRace ?? '').toLowerCase();

  if (typeLower.includes('spell')) {
    if (raceLower.includes('quick')) {
      return 'Quick-Play Spell Card';
    }
    if (raceLower.includes('field')) {
      return 'Field Spell Card';
    }
    if (raceLower.includes('continuous')) {
      return 'Continuous Spell Card';
    }
    if (raceLower.includes('ritual')) {
      return 'Ritual Spell Card';
    }
    if (raceLower.includes('equip')) {
      return 'Equip Spell Card';
    }
    if (raceLower.includes('normal')) {
      return 'Normal Spell Card';
    }
    return 'Spell Card';
  }

  if (typeLower.includes('trap')) {
    if (raceLower.includes('counter')) {
      return 'Counter Trap Card';
    }
    if (raceLower.includes('continuous')) {
      return 'Continuous Trap Card';
    }
    if (raceLower.includes('normal')) {
      return 'Normal Trap Card';
    }
    return 'Trap Card';
  }

  return fallback;
}
