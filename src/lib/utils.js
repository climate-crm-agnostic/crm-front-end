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

/** Thousands-separated integer ("3,006"); explicit locale so es-* browsers group 4-digit numbers too. */
export function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—";
}

/** Whole-dollar amount ("$12,345"). */
export function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : "—";
}
