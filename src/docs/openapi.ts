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
  components: {
    parameters: {
      XLangHeader: {
        in: "header",
        name: "x-lang",
        schema: {
          type: "string",
          enum: ["ENG", "FR"],
        },
        required: false,
        description:
          "Language preference for response messages. Defaults to FR if not provided or invalid.",
        example: "ENG",
      },
      XCurrencyHeader: {
        in: "header",
        name: "x-currency",
        schema: {
          type: "string",
          enum: ["USD", "EUR", "FCFA"],
        },
        required: false,
        description:
          "Currency preference for monetary values in responses. Defaults to FCFA if not provided.",
        example: "EUR",
      },
    },
  },
  paths: {
    "/": {
      get: {
        summary: "Test if the server is running + Header Rules",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
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
