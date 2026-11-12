import fs from "node:fs";
import path from "node:path";

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  );
}

const countries = readJson("data/locations/countries.json");
const statesByCountry = readJson("data/locations/states-by-country.json");
const lgasByState = readJson("data/locations/nigeria-lgas.json");

const errors = [];
const nigeriaStates = Object.keys(lgasByState);
const lgaCount = nigeriaStates.reduce(
  (total, state) => total + lgasByState[state].length,
  0,
);

if (nigeriaStates.length !== 37) {
  errors.push(`Expected 37 Nigerian states, found ${nigeriaStates.length}.`);
}
if (lgaCount !== 774) {
  errors.push(`Expected 774 Nigerian LGAs, found ${lgaCount}.`);
}
if (!(statesByCountry.Nigeria?.length === 37)) {
  errors.push("states-by-country.json must list all 37 Nigerian states.");
}
if (!countries.some((country) => country.code === "NG")) {
  errors.push("countries.json is missing Nigeria.");
}
if (countries.length < 200) {
  errors.push(`Expected at least 200 countries, found ${countries.length}.`);
}
if (countries[0]?.code !== "NG") {
  errors.push("Nigeria must be the first country in countries.json.");
}

for (const state of nigeriaStates) {
  const lgas = lgasByState[state];
  if (!Array.isArray(lgas) || lgas.length === 0) {
    errors.push(`${state} has no LGAs.`);
    continue;
  }
  if (new Set(lgas).size !== lgas.length) {
    errors.push(`${state} contains duplicate LGAs.`);
  }
}

for (const state of statesByCountry.Nigeria ?? []) {
  if (!(state in lgasByState)) {
    errors.push(`${state} is listed but has no LGA mapping.`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Nigerian LGA count by state:");
for (const state of [...nigeriaStates].sort()) {
  console.log(`  ${state}: ${lgasByState[state].length}`);
}
console.log(`  Total: ${lgaCount}`);
console.log(
  `Location data OK: ${countries.length} countries, ${nigeriaStates.length} states, ${lgaCount} LGAs.`,
);
