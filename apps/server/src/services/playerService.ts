import { mongoClient, postgresClient } from "@adventure/database";
import {
  Events,
  type CreatePlayerRequest,
  type Player,
  type PlayerCreatedResponse,
} from "@adventure/shared/types";
import { eventService } from "../events/eventService.js";
import { redisService } from "./redisService.js";

export class PlayerService {
  constructor() {}

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

      await redisService.set(
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

  async walkPlayer(discordUserId: string): Promise<Player | null> {
    // Handle random event logic (e.g., encounter, item collection)
    // First handle if its the users first walk (look for events from the user)
    const isFirstWalk = await this.isFirstWalk(discordUserId);
    if (isFirstWalk) {
      // Handle first walk events
      await this.setupFirstWalk(discordUserId);
    }
  }

  async isFirstWalk(discordUserId: string): Promise<boolean> {
    const firstWalkCachedValue = await redisService.get(
      "firstWalk:" + discordUserId
    );

    if (firstWalkCachedValue) {
      return firstWalkCachedValue === "true";
    }

    const firstWalk = await mongoClient.analyticsEvent.findFirst({
      where: {
        payload: {
          equals: {
            discordUserId: discordUserId,
          },
        },
      },
    });

    if (!firstWalk) {
      await redisService.set("firstWalk:" + discordUserId, "true", "EX", 3600);
    } else {
      await redisService.set("firstWalk:" + discordUserId, "false", "EX", 3600);
    }

    return !firstWalk;
  }

  async setupFirstWalk(discordUserId: string): Promise<void> {
    await eventService.publishEvent({
      eventType: Events.PLAYER_WALKED,
      data: {},
      timestamp: new Date().toISOString(),
      playerId: discordUserId,
    });

    await redisService.set("firstWalk:" + discordUserId, "false", "EX", 3600);

    // give player a treasure chest
    const item = {
      id: "treasure-chest",
      name: "Treasure Chest",
      type: "container",
      description: "A chest filled with random items.",
      quantity: 1,
    };
  }
}
