import { Language } from "@appTypes/preferences.type";
import path from "path";
import { readdir, readFile } from "fs/promises";

type Translations = Record<string, string>;

const translations: Record<Language, Translations> = {
  [Language.ENG]: {},
  [Language.FR]: {},
};

const localesDir = path.join(__dirname, "../locales");

export const loadTranslations = async (): Promise<void> => {
  const files = await readdir(localesDir);

  for (const file of files) {
    const ext = path.extname(file);
    if (ext !== ".json") continue;

    const langKey = file.startsWith("en")
      ? Language.ENG
      : file.startsWith("fr")
      ? Language.FR
      : undefined;

    if (!langKey) continue;

    try {
      const content = await readFile(path.join(localesDir, file), "utf-8");
      translations[langKey] = JSON.parse(content);
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
      translations[langKey] = {};
    }
  }
};

loadTranslations();

const interpolate = (str: string, vars?: Record<string, string>): string =>
  !vars
    ? str
    : str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

export const t = (
  lang: Language,
  key: string,
  vars?: Record<string, string>
): string => {
  const locale = translations[lang] ?? translations[Language.FR];
  const text = locale[key] ?? translations[Language.FR][key] ?? key;
  return interpolate(text, vars);
};

export default t;
