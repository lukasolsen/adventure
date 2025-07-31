import "dotenv/config";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import * as fs from "fs";
import * as path from "path";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is not set!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Required for slash commands
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // For reading message content (not strictly needed for slash commands, but useful for DMs or specific cases)
  ],
});

// Using a Collection for commands for easy access
const commands = new Collection<string, any>();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath); // Use require for dynamic import of command files
  if ("data" in command && "execute" in command) {
    commands.set(command.data.name, command);
  } else {
    console.warn(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user?.tag}!`);
  client.user?.setActivity("Aethelgard Online", { type: 3 }); // Playing activity
  console.log("Registering slash commands...");
  // Register slash commands globally (for development, consider guild-specific first)
  // You'd typically deploy these using a separate script or on bot startup
  const rest = new (require("@discordjs/rest").REST)({
    version: "10",
  }).setToken(TOKEN);
  (async () => {
    try {
      await rest.put(
        require("discord-api-types/v10").Routes.applicationCommands(CLIENT_ID),
        { body: Array.from(commands.values()).map((cmd) => cmd.data.toJSON()) }
      );
      console.log("Successfully registered application commands.");
    } catch (error) {
      console.error("Failed to register application commands:", error);
    }
  })();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // Only handle slash commands

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName} command:`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.login(TOKEN);

// Optional: Graceful shutdown for the bot
process.on("SIGTERM", () => {
  console.log("Bot shutting down...");
  client.destroy();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Bot shutting down...");
  client.destroy();
  process.exit(0);
});
