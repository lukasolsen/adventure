import path from "path";
import {
  REST,
  Routes,
  type Client,
  type SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../types/command.js";
import { readdirSync } from "fs";

export default async function loadCommands(client: Client) {
  const slashCommands: SlashCommandBuilder[] = [];
  const commandsDir = path.resolve("src/commands");

  const files = readdirSync(commandsDir, {
    recursive: true,
    encoding: "utf-8",
  }).filter((file) => {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      return true;
    }
  });

  for (const file of files) {
    try {
      const command = await import(`file://${path.join(commandsDir, file)}`);
      const commandBuilder = command.default as SlashCommand;

      client.slashCommands.set(commandBuilder.command.name, commandBuilder);
      slashCommands.push(
        commandBuilder.command as unknown as SlashCommandBuilder
      );

      console.log(`Loaded command: ${commandBuilder.command.name}`);
    } catch (error) {
      console.error(`Failed to load command from ${file}:`, error);
    }
  }

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN ?? ""
  );

  if (process.env.NODE_ENV !== "production") {
    rest
      .put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID ?? "",
          process.env.DISCORD_DEVELOPER_GUILD_ID ?? ""
        ),
        {
          body: slashCommands.map((command) => command.toJSON()),
        }
      )
      .then((data: any) => {
        console.info(`Successfully loaded ${data.length} slash command(s)`);
      })
      .catch((error) => {
        console.error("Failed to register application commands:", error);
      });
  } else {
    rest
      .put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID ?? ""), {
        body: slashCommands.map((command) => command.toJSON()),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        console.info(`Successfully loaded ${data.length} slash command(s)`);
      })
      .catch((e) => {
        console.error("Failed to load slash commands:", e);
      });
  }
}
