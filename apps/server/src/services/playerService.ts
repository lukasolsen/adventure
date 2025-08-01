import type { Player } from "@adventure/shared/types";

export class PlayerService {
  constructor() {}

  async walkPlayer(discordUserId: string): Promise<Player | null> {
    // Handle random event logic (e.g., encounter, item collection)
  }
}
