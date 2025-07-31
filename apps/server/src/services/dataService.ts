import { postgresClient, mongoClient } from "@adventure/database";
import {
  type Player,
  type ItemDefinition,
  type PlayerInventoryItem,
  type PlayerCreatedResponse,
  type CreatePlayerRequest,
  type ItemCollectedEvent,
} from "@adventure/shared/types";
import { Redis } from "ioredis";
import * as amqp from "amqplib"; // For RabbitMQ

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const GAME_EVENTS_QUEUE = "game_events";

class DataService {
  private redis: Redis;
  private rabbitMqConnection: amqp.ChannelModel | null = null;
  private rabbitMqChannel: amqp.Channel | null = null;

  constructor() {
    this.redis = new Redis(REDIS_URL);
    this.initRabbitMQ();
  }

  private async initRabbitMQ() {
    try {
      this.rabbitMqConnection = await amqp.connect(RABBITMQ_URL);
      if (!this.rabbitMqConnection) {
        throw new Error("Failed to connect to RabbitMQ");
      }

      this.rabbitMqChannel = await this.rabbitMqConnection.createChannel();
      if (!this.rabbitMqChannel) {
        throw new Error("Failed to create RabbitMQ channel");
      }

      await this.rabbitMqChannel.assertQueue(GAME_EVENTS_QUEUE, {
        durable: true,
      });
      console.log("Connected to RabbitMQ and asserted queue.");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      // Handle reconnection logic or graceful degradation here in a real app
    }
  }

  // --- Player Management (PostgreSQL for Account, MongoDB for Character/Inventory) ---

  async createPlayer(
    data: CreatePlayerRequest
  ): Promise<PlayerCreatedResponse> {
    try {
      // Check if Discord ID already has an account (PostgreSQL)
      const existingAccount = await postgresClient.account.findUnique({
        where: { discordId: data.discordUserId },
      });

      if (existingAccount) {
        return {
          success: false,
          message: "An account already exists for this Discord user.",
        };
      }

      // Create new Account in PostgreSQL
      const account = await postgresClient.account.create({
        data: {
          discordId: data.discordUserId,
          username: data.characterName, // Using characterName as initial username
          email: `${data.discordUserId}@discord.game.com`, // Placeholder email
        },
      });

      // Create new Character in MongoDB
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
          inventory: { items: [] }, // Empty inventory
          questLog: [],
        },
      });

      // Cache player data in Redis (e.g., active session data)
      await this.redis.set(
        `player:${data.discordUserId}`,
        JSON.stringify(character),
        "EX",
        3600
      ); // Cache for 1 hour

      return {
        success: true,
        player: {
          id: character.discordId,
          characterName: character.characterName,
          level: character.level,
          gold: character.gold,
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
    // Try to get from Redis cache first
    const cachedPlayer = await this.redis.get(`player:${discordUserId}`);
    if (cachedPlayer) {
      return JSON.parse(cachedPlayer) as Player;
    }

    // If not in cache, fetch from MongoDB
    const character = await mongoClient.character.findUnique({
      where: { discordId: discordUserId },
    });

    if (character) {
      // Cache in Redis before returning
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
    // Add item logic (e.g., stack if stackable, add new entry if not)
    currentInventory.push(item); // Simplified for example

    await mongoClient.character.update({
      where: { discordId: discordUserId },
      data: { inventory: currentInventory as any }, // Prisma might need `as any` for Json types sometimes
    });

    // Invalidate Redis cache for this player's data/inventory
    await this.redis.del(`player:${discordUserId}`);
    // Consider a separate cache key for inventory if you want to be more granular

    return true;
  }

  // --- Global Item Definitions (PostgreSQL) ---

  async getItemDefinition(itemId: string): Promise<ItemDefinition | null> {
    // This would typically be heavily cached in memory on the server
    const definition = await postgresClient.itemDefinition.findUnique({
      where: { id: itemId },
    });
    return definition as ItemDefinition | null;
  }

  // --- Message Queues (RabbitMQ) ---

  async publishGameEvent(event: ItemCollectedEvent | any) {
    if (!this.rabbitMqChannel) {
      console.error("RabbitMQ channel not initialized. Cannot publish event.");
      return;
    }
    try {
      const buffer = Buffer.from(JSON.stringify(event));
      this.rabbitMqChannel.sendToQueue(GAME_EVENTS_QUEUE, buffer, {
        persistent: true,
      });
      console.log(`Published event to RabbitMQ: ${event.eventType}`);
    } catch (error) {
      console.error("Error publishing to RabbitMQ:", error);
      // Handle transient errors, retry, or log for inspection
    }
  }

  async consumeGameEvents(callback: (event: any) => void) {
    if (!this.rabbitMqChannel) {
      console.error("RabbitMQ channel not initialized. Cannot consume events.");
      return;
    }
    this.rabbitMqChannel.consume(
      GAME_EVENTS_QUEUE,
      (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            console.log(`Consumed event from RabbitMQ: ${event.eventType}`);
            callback(event);
            this.rabbitMqChannel?.ack(msg); // Acknowledge message after successful processing
          } catch (error) {
            console.error("Error processing RabbitMQ message:", error);
            this.rabbitMqChannel?.nack(msg); // Nack message if processing fails (re-queue or dead-letter)
          }
        }
      },
      { noAck: false }
    ); // Important: set noAck to false for explicit acknowledgments
  }
}

export const dataService = new DataService();
