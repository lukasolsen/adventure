import { PrismaClient as PostgresClient } from "../prisma/generated/postgres-client/index.js";
import { PrismaClient as MongoClient } from "../prisma/generated/mongo-client/index.js";

export const postgresClient = new PostgresClient();
export const mongoClient = new MongoClient();

// Optional: Connect/disconnect hooks if needed
export async function connectDatabases() {
  try {
    await postgresClient.$connect();
    await mongoClient.$connect();

    console.log("Successfully connected to all databases via Prisma.");
  } catch (error) {
    console.error("Failed to connect to databases:", error);
    process.exit(1);
  }
}

export async function disconnectDatabases() {
  await postgresClient.$disconnect();
  await mongoClient.$disconnect();
  console.log("Disconnected from all databases.");
}
