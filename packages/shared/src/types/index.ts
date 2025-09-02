export interface Player {
  id: string;
  characterName: string;
  level: number;
  experience: number;

  gold: number;
}

export interface PlayerInventoryItem {
  instanceId: string; // Unique ID for this specific item in inventory (UUID)
  definitionId: string; // References ItemDefinition.id
  quantity: number;
  dynamicProps: Record<string, any>; // e.g., { durability: 85, enchantments: [] }
}

export interface CreatePlayerRequest {
  discordUserId: string;
  characterName: string;
}

export interface PlayerCreatedResponse {
  success: boolean;
  player?: Player;
  message: string;
}

export enum Events {
  PLAYER_WALKED = "PLAYER_WALKED",
  PLAYER_CREATED = "PLAYER_CREATED",
  ITEM_COLLECTED = "ITEM_COLLECTED",
  PLAYER_LEVEL_UP = "PLAYER_LEVEL_UP",
  PLAYER_GOLD_CHANGED = "PLAYER_GOLD_CHANGED",
}

export interface IEvent<T = any> {
  eventType: Events;
  playerId?: string; // Optional, only for player-related events
  data: T;
  timestamp: string;
}

export interface ItemCollectedEvent extends IEvent {
  eventType: Events.ITEM_COLLECTED;
  data: {
    itemDefinitionId: string;
    quantity: number;
    location: { x: number; y: number; z: number; mapId: string };
  };
}

export * from "./items.js";
