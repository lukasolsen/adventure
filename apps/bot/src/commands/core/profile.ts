import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type CacheType,
} from "discord.js";
import type { SlashCommand } from "../../types/command.js";
import { ServerApiClient } from "../../lib/apiClient.js";
import { Lang } from "../../services/lang.js";

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your character profile.");

const command: SlashCommand = {
  command: data,
  execute: async (interaction) => {
    await execute(interaction);
  },
  helpText: "Use this command to view your character profile.",
};

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
) {
  await interaction.deferReply({ ephemeral: true });

  const discordUserId = interaction.user.id;
  const apiClient = new ServerApiClient();

  try {
    const existingPlayer = await apiClient.getPlayer(discordUserId);
    if (!existingPlayer) {
      await interaction.editReply(
        "You don't have a character yet. Use `/start` to make one."
      );
      return;
    }

    await interaction.editReply({
      embeds: [
        Lang.getEmbed("displayEmbeds.profile", interaction.locale, {
          TARGET: existingPlayer.characterName,
          LEVEL: existingPlayer.level.toString(),
        }),
      ],
    });
  } catch (error) {
    console.error("Error in /profile command:", error);
    await interaction.editReply(
      "An unexpected error occurred. Please try again later."
    );
  }
}

export default command;
