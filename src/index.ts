import * as dotEnv from "dotenv";
import { createServer } from "http";
import { initializeSocketIO } from "./socket/socket";
dotEnv.config();

import { initJobQueue, registerNotificationJobs, stopJobQueue } from "./jobs";

import { PrismaClient } from "./generated/prisma/client";

import { app } from "./app";

process.on("uncaughtException", (err) => {
  console.log("Uncaught Excetion Error...❌❌");
  console.log(err.name, err.message);
});

import { PrismaPg } from "@prisma/adapter-pg";
import { seedDefaultRecords } from "./defaults";
import { loadTranslations } from "@utils/translate.util";
import runCronJobs from "./cron-jobs";
import { initializeFireBaseServices } from "@services/fcm";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

prisma
  .$connect()
  .then(() => console.log("Successful db connection. ✅✅"))
  .catch((err: any) => {
    console.error("Error connecting to database: ", err);
    process.exit(1);
  })
  .then(async () => {
    await loadTranslations();
    await seedDefaultRecords();
  })
  .catch((err) => {
    console.log("Error seeding default records: ", err);
  })
  .then(async () => {
    await runCronJobs();
  })
  .catch((err) => {
    console.log("Error running Cron Jobs: ", err);
  })
  .then(async () => {
    const boss = await initJobQueue();
    await registerNotificationJobs(boss);
    console.log("Background jobs initialized. ✅✅");
  })
  .catch((err) => {
    console.log("Error initializing job queue: ", err);
  });

const port: number = Number(process.env.PORT) || 3000;

const httpServer = createServer(app);
initializeFireBaseServices();
const io = initializeSocketIO(httpServer);

httpServer.listen(port, () => {
  console.log(`App is up and running on port: ${port}`);
  console.log(
    `Socket.IO listening on ${process.env.SOCKET_IO_PATH || "/socket.io"}`
  );
});

const shutdown = async () => {
  console.log("Shutting down gracefully...");
  await stopJobQueue();
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Error...❌❌");
  console.log(err);
});

export { prisma, httpServer, io };
