import { postgresClient, mongoClient } from "@adventure/database";
import {
  type Player,
  type ItemDefinition,
  type PlayerInventoryItem,
  type PlayerCreatedResponse,
  type CreatePlayerRequest,
} from "@adventure/shared/types";
import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

class DataService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL);
  }

  // --- Player Management (PostgreSQL for Account, MongoDB for Character/Inventory) ---
  async createPlayer(
    data: CreatePlayerRequest
  ): Promise<PlayerCreatedResponse> {
    try {
      const existingAccount = await postgresClient.account.findUnique({
        where: { discordId: data.discordUserId },
      });

      if (existingAccount) {
        return {
          success: false,
          message: "An account already exists for this Discord user.",
        };
      }

      const account = await postgresClient.account.create({
        data: {
          discordId: data.discordUserId,
          username: data.characterName,
          email: `${data.discordUserId}@discord.game.com`,
        },
      });

      const character = await mongoClient.character.create({
        data: {
          accountId: account.id,
          discordId: data.discordUserId,
          characterName: data.characterName,
          level: 1,
          gold: 100,
          stats: {
            strength: 10,
            agility: 10,
            intellect: 10,
            stamina: 10,
            hp: 100,
            mana: 50,
          },
          inventory: { items: [] },
          questLog: [],
        },
      });

      await this.redis.set(
        `player:${data.discordUserId}`,
        JSON.stringify(character),
        "EX",
        3600
      );

      return {
        success: true,
        player: {
          id: character.discordId,
          characterName: character.characterName,
          level: character.level,
          gold: character.gold,
          experience: character.experience,
        },
        message: `Character ${character.characterName} created successfully!`,
      };
    } catch (error: any) {
      console.error("Error creating player:", error);
      return {
        success: false,
        message: `Failed to create character: ${error.message}`,
      };
    }
  }

  async getPlayer(discordUserId: string): Promise<Player | null> {
    const cachedPlayer = await this.redis.get(`player:${discordUserId}`);
    if (cachedPlayer) {
      return JSON.parse(cachedPlayer) as Player;
    }

    const character = await mongoClient.character.findUnique({
      where: { discordId: discordUserId },
    });

    if (character) {
      await this.redis.set(
        `player:${discordUserId}`,
        JSON.stringify(character),
        "EX",
        3600
      );
      return {
        id: character.discordId,
        characterName: character.characterName,
        level: character.level,
        gold: character.gold,
        experience: character.experience,
      };
    }
    return null;
  }

  async getPlayerInventory(
    discordUserId: string
  ): Promise<PlayerInventoryItem[] | null> {
    const character = await mongoClient.character.findUnique({
      where: { discordId: discordUserId },
      select: { inventory: true },
    });
    if (!character) return null;
    return character.inventory as unknown as PlayerInventoryItem[];
  }

  async addItemToPlayerInventory(
    discordUserId: string,
    item: PlayerInventoryItem
  ): Promise<boolean> {
    const character = await mongoClient.character.findUnique({
      where: { discordId: discordUserId },
      select: { inventory: true },
    });

    if (!character) return false;

    let currentInventory: PlayerInventoryItem[] = [];
    if (Array.isArray(character.inventory)) {
      currentInventory =
        character.inventory as unknown as PlayerInventoryItem[];
    }
    currentInventory.push(item);

    await mongoClient.character.update({
      where: { discordId: discordUserId },
      data: { inventory: currentInventory as any },
    });

    await this.redis.del(`player:${discordUserId}`);

    return true;
  }

  async getItemDefinition(itemId: string): Promise<ItemDefinition | null> {
    const definition = await postgresClient.itemDefinition.findUnique({
      where: { id: itemId },
    });
    return definition as ItemDefinition | null;
  }
}

export const dataService = new DataService();
