import fs from "node:fs/promises";

const url = "https://api.guildwars2.com/v2/currencies?ids=all";

const res = await fetch(url);
if (!res.ok) throw new Error(`Failed: ${res.status} ${await res.text()}`);

const currencies = await res.json();

// convert array -> id map (smaller + faster lookups)
const map = {};
for (const c of currencies) {
    map[String(c.id)] = {
        name: c.name,
        icon: c.icon,
        description: c.description ?? "",
        order: c.order ?? 0,
    };
}

await fs.mkdir("./public/static/gw2", { recursive: true });
await fs.writeFile(
    "./public/static/gw2/currencies.json",
    JSON.stringify(map, null, 2),
    "utf8"
);

console.log("Wrote ./public/static/gw2/currencies.json");