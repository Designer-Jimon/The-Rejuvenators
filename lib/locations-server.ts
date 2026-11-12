import statesData from "@/data/locations/states-by-country.json";
import lgasData from "@/data/locations/nigeria-lgas.json";
import { canonicalCountry } from "@/lib/locations";

const STATES_BY_COUNTRY = statesData as Record<string, string[]>;
const LGAS_BY_STATE = lgasData as Record<string, string[]>;

export function statesForCountry(country: string) {
  return STATES_BY_COUNTRY[canonicalCountry(country)] ?? [];
}

export function lgasForLocation(country: string, state: string) {
  if (canonicalCountry(country) !== "Nigeria") return [];
  return LGAS_BY_STATE[state.trim()] ?? [];
}

export function isKnownState(country: string, state: string) {
  return statesForCountry(country).some(
    (item) => item.toLowerCase() === state.trim().toLowerCase(),
  );
}

export function isKnownLga(country: string, state: string, lga: string) {
  return lgasForLocation(country, state).some(
    (item) => item.toLowerCase() === lga.trim().toLowerCase(),
  );
}
