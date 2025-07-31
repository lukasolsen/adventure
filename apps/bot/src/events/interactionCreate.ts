import type {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  Interaction,
} from "discord.js";
import { Events } from "discord.js";
import { EventType, type BotEvent } from "../types/event.js";

const event: BotEvent = {
  name: Events.InteractionCreate,
  type: EventType.ON,
  execute: async (_: Client, interaction: Interaction) => {
    if (interaction.isCommand()) await executeCommand(interaction);
  },
};

export default event;

async function executeCommand(interaction: CommandInteraction) {
  const command = interaction.client.slashCommands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(
        interaction as ChatInputCommandInteraction<CacheType>,
        interaction.user
      );
    } catch (error) {
      console.error(error);
      await interaction
        .reply({ content: `${error}`, ephemeral: true })
        .catch((err) => {
          interaction.followUp({ content: `${err}`, ephemeral: true });
        }); // If fails just sends it right on back
    }
  }
}
