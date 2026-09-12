import { ar } from "./messages/ar";
import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import type { InterpolationValues } from "./types";

export * from "./config";
export type { MessageKey };
export type { Direction, InterpolationValues, Locale } from "./types";

export const messages = { en, ar, fr, es } as const;

export function interpolate(
  template: string,
  values: InterpolationValues = {},
): string {
  return template.replace(/\{([^{}]+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : placeholder,
  );
}
