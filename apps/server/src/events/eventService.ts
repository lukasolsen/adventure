import { mongoClient } from "@adventure/database";
import type { IEvent } from "@adventure/shared/types";
import * as amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const GAME_EVENTS_QUEUE = "game_events";

export class EventService {
  private rabbitMqConnection: amqp.ChannelModel | null = null;
  private rabbitMqChannel: amqp.Channel | null = null;

  constructor() {}

  async initRabbitMQ() {
    try {
      if (this.rabbitMqConnection) {
        console.warn("RabbitMQ connection already initialized.");
        return;
      }

      this.rabbitMqConnection = await amqp.connect({
        username: "adventure",
        password: "adventure",
        protocol: "amqp",
        hostname: "localhost",
        port: 5672,
      });
      if (!this.rabbitMqConnection) {
        console.error("Failed to connect to RabbitMQ");
        throw new Error("Failed to connect to RabbitMQ");
      }

      this.rabbitMqChannel = await this.rabbitMqConnection.createChannel();
      if (!this.rabbitMqChannel) {
        console.error("Failed to create RabbitMQ channel");
        throw new Error("Failed to create RabbitMQ channel");
      }

      await this.rabbitMqChannel.assertQueue(GAME_EVENTS_QUEUE, {
        durable: true,
      });
      console.log("Connected to RabbitMQ and asserted queue.");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
    }
  }

  async publishEvent(event: IEvent) {
    if (!this.rabbitMqChannel) {
      console.error("RabbitMQ channel not initialized. Cannot publish event.");
      return;
    }

    try {
      const buffer = Buffer.from(JSON.stringify(event));
      this.rabbitMqChannel.sendToQueue(GAME_EVENTS_QUEUE, buffer, {
        persistent: true,
      });
      console.log(`Published event: ${event.eventType}`);
    } catch (error) {
      console.error("Error publishing event to RabbitMQ:", error);
    }
  }

  async consumeEvents() {
    if (!this.rabbitMqChannel) {
      console.error("RabbitMQ channel not initialized. Cannot consume events.");
      return;
    }

    this.rabbitMqChannel.consume(
      GAME_EVENTS_QUEUE,
      async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString()) as IEvent;
            console.log(`Consumed event: ${event.eventType}`);

            await mongoClient.analyticsEvent.create({
              data: {
                eventType: event.eventType,
                payload: {
                  ...event.data,
                  playerId: event?.playerId,
                },
                createdAt: new Date(event.timestamp),
                updatedAt: new Date(event.timestamp),
              },
            });

            this.rabbitMqChannel?.ack(msg);
          } catch (error) {
            console.error("Error processing RabbitMQ message:", error);
            this.rabbitMqChannel?.nack(msg);
          }
        }
      },
      { noAck: false }
    );
  }
}

export const eventService = new EventService();
