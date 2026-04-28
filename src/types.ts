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
  imageCropped?: string;
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
  fullImage?: string;
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

export interface SavedDeckSummary {
  main: number;
  extra: number;
  side: number;
  points?: number;
  version?: number;
}

export interface SavedDeckEntry {
  id: string;
  name: string;
  deck: string;
  savedAt: string;
  summary?: SavedDeckSummary;
}

export interface SavedDeckFolder {
  id: string;
  name: string;
  decks: SavedDeckEntry[];
}

export type Format = 'genesys' | 'advanced';

export interface MetaData {
  lastUpdated: string;
  genesys: {
    recentDecks: Array<{
      name: string;
      url: string;
      meta: string;
    }>;
  };
  advanced: {
    recentDecks: Array<{
      name: string;
      url: string;
      meta: string;
    }>;
    banlist: Record<string, 'Forbidden' | 'Limited' | 'Semi-Limited'>;
  };
  popularCards: Record<string, {
    name: string;
    viewsweek: number;
    views: number;
    upvotes: number;
    downvotes: number;
    staple: boolean;
    archetype?: string;
    formats?: string[];
    metaContext?: {
      genesys?: boolean;
      advanced?: boolean;
    };
  }>;
}


