import process from "node:process";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, closeMongo } from "./db/mongo.js";
import { registerExamSockets } from "./modules/exams/exam.socket.js";

async function main() {
  await connectMongo();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[api] http://localhost:${env.PORT}`);
  });
  registerExamSockets(server);

  const shutdown = async (signal) => {
    console.log(`[api] ${signal}, shutting down`);
    server.close();
    await closeMongo();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
