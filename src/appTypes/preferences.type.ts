export const Language = {
  FR: "FR",
  ENG: "ENG",
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export const Currency = {
  XAF: "XAF",
  EUR: "EUR",
  USD: "USD",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];
