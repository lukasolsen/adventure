import { postgresClient } from "@adventure/database";
import type { ItemDefinition } from "../../../../packages/database/prisma/generated/postgres-client/index.js";
import type { ItemId } from "@adventure/shared/types";

export class ItemService {
  constructor() {}

  async getItemDefinition(itemId: ItemId): Promise<ItemDefinition | null> {
    const definition = await postgresClient.itemDefinition.findUnique({
      where: { id: itemId },
    });
    return definition as ItemDefinition | null;
  }
}
