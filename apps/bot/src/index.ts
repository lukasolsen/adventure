import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { Logger } from "./constants/logger.js";
import loadEvents from "./handlers/events.js";
import type { SlashCommand } from "./types/command.js";
import loadCommands from "./handlers/commands.js";

const client = new Client({
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: true,
  },
  presence: {
    activities: [{ name: "a tcg game" }],
    status: "online",
    afk: false,
  },
  partials: [Partials.Message, Partials.Reaction],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  closeTimeout: 60000,
});

client.slashCommands = new Collection<string, SlashCommand>();

loadEvents(client);
loadCommands(client);

try {
  await client.login(process.env.DISCORD_BOT_TOKEN ?? "");
  Logger.getInstance().log("info", "Bot successfully logged in.");
} catch (err) {
  Logger.getInstance().log("error", `Login failed: ${err}`);
  process.exit(1);
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
