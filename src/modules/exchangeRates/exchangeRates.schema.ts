import { Currency } from "@appTypes/preferences.type";
import { z } from "zod";

export const currencyExchangeSchema = z.object({
  amount: z
    .number()
    .positive("error.currency.amount_to_convert_less_than_zero"),
  from: z.nativeEnum(Currency),
  to: z.nativeEnum(Currency),
});

export type CurrencyExchangeInput = z.infer<typeof currencyExchangeSchema>;
