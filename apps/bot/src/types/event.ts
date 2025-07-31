import type { RESTEvents } from "discord.js";

export enum EventType {
  ONCE = "once",
  ON = "on",
  REST_ON = "rest_on",
}

export interface BotEvent {
  name: RESTEvents | string;
  type: EventType;

  execute: (...args: any) => void;
}
