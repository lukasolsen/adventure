export interface Player {
  id: string; // Discord User ID for consistent linking
  characterName: string;
  level: number;
  gold: number;
  // Add other core player stats that are always present
}

export interface ItemDefinition {
  id: string; // e.g., "ITEM_STICK_BASIC"
  name: string;
  description: string;
  type: "WEAPON" | "CONSUMABLE" | "MATERIAL" | "ARMOR";
  iconUrl: string; // URL to CDN asset
  stackable: boolean; // Can this item be stacked in inventory?
  properties: Record<string, any>;
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

export interface ItemCollectedEvent {
  eventType: "ITEM_COLLECTED";
  timestamp: string;
  playerId: string;
  itemDefinitionId: string;
  quantity: number;
  location: { x: number; y: number; z: number; mapId: string };
}
