import { Client, Events } from "discord.js";
import { EventType, type BotEvent } from "../types/event.js";

const event: BotEvent = {
  name: Events.ClientReady,
  type: EventType.ONCE,
  execute(client: Client) {
    console.log(`Logged in as ${client.user?.tag}`);
  },
};

export default event;
