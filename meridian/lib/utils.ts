import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serialises a value for a jsonb column.
 *
 * The round-trip is deliberate: it drops `undefined` (which jsonb cannot
 * store) and produces exactly the shape that will come back out on the next
 * read, so what a component receives from the database matches what was
 * written.
 */
export function toJson<T>(value: T): import("@/types/database").Json {
  return JSON.parse(JSON.stringify(value ?? null));
}
