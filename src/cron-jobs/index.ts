import { registerExchangeRateCron } from "./updateExchangeRates.cron-job";

const runCronJobs = async () => {
  registerExchangeRateCron();
};

export default runCronJobs;
