import express from "express";
import apiRouter from "./api/index.js";
import { connectDatabases, disconnectDatabases } from "@adventure/database";
import { dataService } from "./services/dataService.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

app.use("/api", apiRouter); // Mount your API routes

async function startServer() {
  await connectDatabases(); // Connect Prisma to PostgreSQL and MongoDB
  // dataService constructor will handle Redis and RabbitMQ initialization

  // Example of starting a consumer for game events (can be in a separate consumer app)
  dataService.consumeGameEvents((event) => {
    // This is where your analytics service or other background workers would process events
    console.log(
      `[Analytics Consumer] Received event: ${JSON.stringify(event)}`
    );
    // e.g., store in an analytics database, update leaderboards, etc.
  });

  app.listen(PORT, () => {
    console.log(`Game Server running on port ${PORT}`);
    console.log(
      "Server API Key:",
      process.env.SERVER_API_KEY ? "Set" : "NOT SET"
    );
  });
}

startServer();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await disconnectDatabases();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await disconnectDatabases();
  process.exit(0);
});
