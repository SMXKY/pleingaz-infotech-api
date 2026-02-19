if (!process.env.BASE_URL) {
  throw new Error("Base url enviroment variable not set");
}

if (!process.env.FRONTEND_URL) {
  throw new Error("Frontend url enviroment variable not set");
}

export const baseUrl = process.env.BASE_URL;
export const frontEndUrl = process.env.FRONTEND_URL;
