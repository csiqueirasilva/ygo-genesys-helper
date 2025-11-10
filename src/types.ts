export type DeckSection = 'main' | 'extra' | 'side';

export interface GenesysCard {
  name: string;
  points: number;
}

export interface GenesysPayload {
  source: string;
  lastUpdated: string;
  cards: GenesysCard[];
}

export interface CardDetails {
  id: number;
  name: string;
  type?: string;
  race?: string;
  desc?: string;
  image?: string;
  ygoprodeckUrl?: string;
}

export interface DeckGroups {
  main: DeckCardGroup[];
  extra: DeckCardGroup[];
  side: DeckCardGroup[];
}

export interface DeckCardGroup {
  id: number;
  name: string;
  count: number;
  zone: DeckSection;
  image?: string;
  type?: string;
  desc?: string;
  linkUrl?: string;
  pointsPerCopy: number;
  totalPoints: number;
  missingInfo: boolean;
  notInList: boolean;
}
