import type { SupportedLanguage } from "./config";
import type englishTranslation from "./lang/en.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof englishTranslation;
    Locale: SupportedLanguage;
  }
}
