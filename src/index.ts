import * as dotEnv from "dotenv";
import { PrismaClient } from "./generated/prisma/client";

import { app } from "./app";

dotEnv.config();

process.on("uncaughtException", (err) => {
  console.log("Uncaught Excetion Error...❌❌");
  console.log(err.name, err.message);
});

import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

prisma
  .$connect()
  .then(() => console.log("Successful db connection. ✅✅"))
  .catch((err: any) => {
    console.error("Error connecting to database: ", err);
    process.exit(1);
  });

const port: number = Number(process.env.PORT) || 3000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`App is up and running on port: ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection Error...❌❌");
  console.log(err);
});

export { prisma };
