import express from "express";
import { dataService } from "../services/dataService.js";
import {
  type CreatePlayerRequest,
  type ItemCollectedEvent,
  type PlayerCreatedResponse,
} from "@adventure/shared/types";

const router: express.Router = express.Router();

// Middleware to secure API calls from the bot
router.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === process.env.SERVER_API_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Unauthorized API Access" });
  }
});

router.post("/player/create", async (req, res) => {
  const { discordUserId, characterName } = req.body as CreatePlayerRequest;
  if (!discordUserId || !characterName) {
    return res
      .status(400)
      .json({ message: "Missing discordUserId or characterName" });
  }
  const result: PlayerCreatedResponse = await dataService.createPlayer({
    discordUserId,
    characterName,
  });
  if (result.success) {
    res.status(201).json(result.player);
  } else {
    res.status(409).json({ message: result.message });
  }
});

router.get("/player/:discordUserId", async (req, res) => {
  const { discordUserId } = req.params;
  const player = await dataService.getPlayer(discordUserId);
  if (player) {
    res.json(player);
  } else {
    res.status(404).json({ message: "Player not found" });
  }
});

router.post("/player/:discordUserId/collect-item", async (req, res) => {
  const { discordUserId } = req.params;
  const { itemDefinitionId, quantity, location } = req.body; // Simplified item data
  if (!itemDefinitionId || !quantity || !location) {
    return res.status(400).json({ message: "Missing item data" });
  }

  // First, get the item definition (global item)
  const itemDefinition = await dataService.getItemDefinition(itemDefinitionId);
  if (!itemDefinition) {
    return res.status(404).json({ message: "Item definition not found" });
  }

  // Create an item instance (user specific)
  const newItemInstance = {
    instanceId: `item-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`, // Unique ID for this item
    definitionId: itemDefinitionId,
    quantity: itemDefinition.stackable ? quantity : 1, // Ensure quantity is 1 for non-stackable
    dynamicProps: { acquiredAt: new Date().toISOString() }, // Example dynamic prop
  };

  const success = await dataService.addItemToPlayerInventory(
    discordUserId,
    newItemInstance
  );

  if (success) {
    // Publish an event to the message queue for analytics/logging
    const event: ItemCollectedEvent = {
      eventType: "ITEM_COLLECTED",
      timestamp: new Date().toISOString(),
      playerId: discordUserId,
      itemDefinitionId: itemDefinitionId,
      quantity: quantity,
      location: location,
    };
    await dataService.publishGameEvent(event);

    res.json({
      message: "Item collected and added to inventory",
      item: newItemInstance,
    });
  } else {
    res.status(500).json({ message: "Failed to add item to inventory" });
  }
});

export default router;
