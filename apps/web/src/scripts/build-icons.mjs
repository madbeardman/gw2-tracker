import fs from "node:fs/promises";

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${await res.text()}`);
    return res.json();
}

function toKey(name) {
    return String(name).trim();
}

const professions = await fetchJson("https://api.guildwars2.com/v2/professions?ids=all");
const races = await fetchJson("https://api.guildwars2.com/v2/races?ids=all");

const professionIcons = {};
for (const p of professions) {
    professionIcons[toKey(p.name)] = {
        icon: p.icon ?? "",
        big_icon: p.big_icon ?? "",
    };
}

const raceIcons = {};
for (const r of races) {
    // races endpoint sometimes differs by fields; keep it flexible
    raceIcons[toKey(r.name)] = {
        icon: r.icon ?? r.big_icon ?? "",
        big_icon: r.big_icon ?? r.icon ?? "",
    };
}

await fs.mkdir("./public/static/gw2", { recursive: true });
await fs.writeFile("./public/static/gw2/profession-icons.json", JSON.stringify(professionIcons, null, 2), "utf8");
await fs.writeFile("./public/static/gw2/race-icons.json", JSON.stringify(raceIcons, null, 2), "utf8");

console.log("Wrote ./public/static/gw2/profession-icons.json");
console.log("Wrote ./public/static/gw2/race-icons.json");