import countriesData from "@/data/locations/countries.json";

export type CountryOption = { code: string; name: string };

export const COUNTRIES = countriesData as CountryOption[];

type StatesByCountry = Record<string, string[]>;
type LgasByState = Record<string, string[]>;

export function isKnownCountry(name: string) {
  return COUNTRIES.some(
    (country) => country.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

export function canonicalCountry(name: string) {
  const match = COUNTRIES.find(
    (country) => country.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.name ?? name.trim();
}

export function isNigeria(country: string) {
  return canonicalCountry(country) === "Nigeria";
}

export async function loadStatesForCountry(country: string) {
  if (!country.trim()) return [];
  const module = await import("@/data/locations/states-by-country.json");
  const data = module.default as StatesByCountry;
  return data[canonicalCountry(country)] ?? [];
}

export async function loadLgasForLocation(country: string, state: string) {
  if (!isNigeria(country) || !state.trim()) return [];
  const module = await import("@/data/locations/nigeria-lgas.json");
  const data = module.default as LgasByState;
  return data[state.trim()] ?? [];
}
