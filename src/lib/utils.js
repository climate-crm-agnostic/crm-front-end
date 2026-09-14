import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Lowercased and stripped of accents, for matching what someone typed against
 * what is on screen: "colon" has to find "Colón" and "mexico" has to find
 * "México", because nobody reaches for the accented key to search.
 *
 * Shared by the single- and multi-select pickers so the two filter alike.
 */
export function foldForSearch(text) {
  return String(text).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
