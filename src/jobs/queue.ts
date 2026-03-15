import { DATABASE_URL } from "@utils/enviromentVariablesCheck.util";
import { PgBoss } from "pg-boss";

let boss: PgBoss | null = null;

export async function initJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: DATABASE_URL,
    schema: "pgboss",
    monitorIntervalSeconds: 30,
  });

  boss.on("error", (error) => {
    console.error("pg-boss error:", error);
  });

  boss.on("monitor-states", (states) => {
    console.info("pg-boss queue states:", states);
  });

  await boss.start();
  console.log("pg-boss job queue started 👷🏿‍♂️✅");

  return boss;
}

export function getJobQueue(): PgBoss {
  if (!boss) {
    throw new Error("Job queue not initialized. Call initJobQueue() first.");
  }
  return boss;
}

export async function stopJobQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30_000 });
    boss = null;
    console.log("pg-boss job queue stopped");
  }
}
