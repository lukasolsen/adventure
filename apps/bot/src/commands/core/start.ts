import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command.js";
import { ServerApiClient } from "../../lib/apiClient.js";

export const data = new SlashCommandBuilder()
  .setName("start")
  .setDescription("Starts your adventure in Aethelgard Online!")
  .addStringOption((option) =>
    option
      .setName("character_name")
      .setDescription("Your character's name")
      .setRequired(true)
      .setMaxLength(20)
      .setMinLength(3)
  );

const command: SlashCommand = {
  command: data,
  execute: async (interaction) => {
    await execute(interaction);
  },
  helpText:
    "Use this command to create your character and start your adventure in Aethelgard Online.",
};

export async function execute(interaction: any) {
  // Discord.js Interaction types for real use
  await interaction.deferReply({ ephemeral: true }); // Acknowledge interaction immediately

  const discordUserId = interaction.user.id;
  const characterName = interaction.options.getString("character_name");
  const apiClient = new ServerApiClient();

  try {
    const existingPlayer = await apiClient.getPlayer(discordUserId);
    if (existingPlayer) {
      await interaction.editReply(
        `You already have a character named **${existingPlayer.characterName}**! Use \`/profile\` to see your stats.`
      );
      return;
    }

    const createResult = await apiClient.createPlayer({
      discordUserId,
      characterName,
    });

    if (createResult.success && createResult.player) {
      await interaction.editReply(
        `Welcome, **${createResult.player.characterName}**! Your adventure in Aethelgard Online begins now. You have ${createResult.player.gold} gold.`
      );
    } else {
      await interaction.editReply(
        `Failed to create your character: ${createResult.message}`
      );
    }
  } catch (error) {
    console.error("Error in /start command:", error);
    await interaction.editReply(
      "An unexpected error occurred. Please try again later."
    );
  }
}

export default command;
