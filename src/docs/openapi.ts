export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Pliengaz - Infotech API",
    version: "1.0.0",
    description: "API documentation for Pliengaz",
  },
  servers: [
    {
      url: "",
      description: "Local server",
    },
  ],
  paths: {
    "/": {
      get: {
        summary: "Test if the server is running",
        responses: {
          "200": {
            description: "Pliengaz - Infotech Server is up and running.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};
