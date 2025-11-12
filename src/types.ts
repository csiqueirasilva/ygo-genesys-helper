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
  level?: number;
  linkValue?: number;
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
  race?: string;
  displayType?: string;
  desc?: string;
  level?: number;
  linkValue?: number;
  orderIndex?: number;
  linkUrl?: string;
  pointsPerCopy: number;
  totalPoints: number;
  missingInfo: boolean;
  notInList: boolean;
}

export interface AssistantDeckContext {
  points_cap: number;
  total_points: number;
  points_remaining: number;
  deck_goal: string;
  deck_cards: string;
  card_point_list: string;
  notes: string;
}
