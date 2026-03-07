import fs from "node:fs/promises";

const url = "https://api.guildwars2.com/v2/masteries?ids=all";

const res = await fetch(url);
if (!res.ok) {
    throw new Error(`Failed to fetch masteries: ${res.status} ${await res.text()}`);
}

const masteries = await res.json();

// Keep it simple for now: store as-is.
await fs.mkdir("./public/static/gw2", { recursive: true });
await fs.writeFile(
    "./public/static/gw2/masteries.json",
    JSON.stringify(masteries, null, 2),
    "utf8",
);

console.log("Wrote ./public/static/gw2/masteries.json");