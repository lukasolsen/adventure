import express from "express";
import apiRouter from "./api/index.js";
import { connectDatabases, disconnectDatabases } from "@adventure/database";
import { Events } from "@adventure/shared/types";
import { eventService } from "./events/index.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || "localhost";

app.use(express.json());

app.use("/api", apiRouter);

async function startServer() {
  await connectDatabases();

  await eventService.initRabbitMQ();
  await eventService.consumeEvents();

  app.listen(PORT, HOST, () => {
    console.log(`Game Server running on http://${HOST}:${PORT}`);
    console.log(
      "Server API Key:",
      process.env.SERVER_API_KEY ? "Set" : "NOT SET"
    );
  });
}

startServer();

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
