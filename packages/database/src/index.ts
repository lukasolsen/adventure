import { PrismaClient as PostgresClient } from "../prisma/generated/postgres-client/index.js";
import { PrismaClient as MongoClient } from "../prisma/generated/mongo-client/index.js";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export const postgresClient = new PostgresClient();
export const mongoClient = new MongoClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Current directory:", __dirname);

const itemDataPath = join(__dirname, "../../shared/data", "items");

export async function connectDatabases() {
  try {
    await postgresClient.$connect();
    await mongoClient.$connect();

    await importItems();

    console.log("Successfully connected to all databases via Prisma.");
  } catch (error) {
    console.error("Failed to connect to databases:", error);
    process.exit(1);
  }
}

async function importItems() {
  console.log("Starting item data import...");
  try {
    const itemFiles = fs
      .readdirSync(itemDataPath)
      .filter((file) => file.endsWith(".json"));

    const allItems = [];
    for (const file of itemFiles) {
      const filePath = join(itemDataPath, file);
      const fileContents = fs.readFileSync(filePath, "utf-8");
      const itemsInFile = JSON.parse(fileContents);
      allItems.push(...itemsInFile);
    }

    console.log(`Found ${allItems.length} items to import.`);

    // Use Prisma's $transaction for a safe, atomic import
    const upsertPromises = allItems.map((item) => {
      return postgresClient.itemDefinition.upsert({
        where: { id: item.id },
        update: {
          name: item.name,
          description: item.description,
          type: item.type,
          rarity: item.rarity,
          stackable: item.stackable,
          maxStackSize: item.max_stack_size,
          iconUrl: item.iconUrl,
          properties: item.properties,
        },
        create: {
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type,
          rarity: item.rarity,
          stackable: item.stackable,
          maxStackSize: item.max_stack_size,
          iconUrl: item.iconUrl,
          properties: item.properties,
        },
      });
    });

    await postgresClient.$transaction(upsertPromises);

    console.log(`Successfully imported ${allItems.length} item definitions.`);
  } catch (error) {
    console.error("Error importing item data:", error);
    process.exit(1);
  }
}

export async function disconnectDatabases() {
  await postgresClient.$disconnect();
  await mongoClient.$disconnect();
  console.log("Disconnected from all databases.");
}
