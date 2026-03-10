import { Currency, Language, User } from "src/generated/prisma";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  TERMINATED = "TERMINATED",
  SUSPENDED = "SUSPENDED"
}

export enum UserCurrency {
  FCFA = "FCFA",
  EUR = "EUR",
  USD = "USD",
}

export enum UserLanguage {
  FR = "FR",
  ENG = "ENG",
}

export enum TokenType {
  PASSWORD_SETUP = "PASSWORD_SETUP",
  PASSWORD_RESET = "PASSWORD_RESET",
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
}

export type UserPreferences = {
  language: Language;
  currency: Currency;
};

export type UpdateMeResult = Omit<User, "password"> & {
  preferences: UserPreferences;
};
