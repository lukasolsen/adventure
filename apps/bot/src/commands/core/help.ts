import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command.js";

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help information.")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("The topic you need help with.")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    try {
      const topic = interaction.options.getString("topic");

      if (!topic) {
        await interaction.reply("Please provide a topic.");
        return;
      }

      const helpMessage = `Help information for topic: ${topic}.`;
      await interaction.reply(helpMessage);
    } catch (error) {
      console.error("Failed to execute help command:", error);
    }
  },
};

export default command;
