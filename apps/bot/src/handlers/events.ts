import path from "path";
import type { Client } from "discord.js";
import type { BotEvent } from "../types/event.js";
import { readdirSync } from "fs";

const eventsDir = path.resolve("src/events");

export default async function loadEvents(client: Client) {
  const files = readdirSync(eventsDir, {
    recursive: true,
    encoding: "utf-8",
  }).filter((file) => {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      return true;
    }
  });

  for (const file of files) {
    try {
      const event = await import(`file://${path.join(eventsDir, file)}`);
      const eventFunction = event.default as BotEvent;

      if (typeof eventFunction.name !== "string") {
        console.error(
          `Event function in ${file} does not have a valid name property.`
        );
        continue;
      }

      client.on(eventFunction.name, (...args) =>
        eventFunction.execute(client, ...args)
      );

      console.log(`Loaded event: ${eventFunction.name}`);
    } catch (error) {
      console.error(`Failed to load event from ${file}:`, error);
    }
  }
}
