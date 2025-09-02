// read json file from ../../data/items/*.json
// then get every item and create a type for all item ids
import * as fs from "fs";
import * as path from "path";
import { __dirname } from "../utils/dirname.js";

const itemsDir = path.join(__dirname, "../../data/items");
const itemFiles = fs.readdirSync(itemsDir);

const itemTypes = itemFiles.map((file) => {
  const itemData = fs.readFileSync(path.join(itemsDir, file), "utf-8");
  const item = JSON.parse(itemData);
  return item.id;
});

export type ItemId = (typeof itemTypes)[number];

export interface ItemDefinition {
  id: string; // e.g., "ITEM_STICK_BASIC"
  name: string;
  description: string;
  type: "WEAPON" | "CONSUMABLE" | "MATERIAL" | "ARMOR" | "CONTAINER";
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  iconUrl: string; // URL to CDN asset
  stackable: boolean; // Can this item be stacked in inventory?
  properties: Record<string, any>;
}
