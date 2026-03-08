// src/scripts/build-mastery-insights.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("public/static/gw2");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mastery-insights.json");
const DEBUG_FILE = path.join(OUTPUT_DIR, "mastery-insights-debug.json");
const ACHIEVEMENTS_FILE = path.resolve("public/static/gw2/mastery-achievements.json");

const REGION_NAME_MAP = {
    Tyria: "Central Tyria",
    Maguuma: "Heart of Thorns",
    Desert: "Path of Fire",
    Tundra: "Icebrood Saga",
    Jade: "End of Dragons",
    Sky: "Secrets of the Obscure",
    Wild: "Janthir Wilds",
    Magic: "Visions of Eternity",
};

async function readJson(filePath) {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
}

function normaliseRegionName(region) {
    if (!region) return null;
    return REGION_NAME_MAP[region] ?? region;
}

function normaliseText(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function buildExpansion(region, regionName) {
    if (region && REGION_NAME_MAP[region]) {
        return REGION_NAME_MAP[region];
    }

    if (regionName) {
        return regionName;
    }

    return null;
}

function buildMapNameFromInsightAchievementName(name) {
    if (typeof name !== "string") return null;

    if (name === "Salvation Pass Mastery") {
        return "Salvation Pass";
    }

    const marker = " Insight:";
    const index = name.indexOf(marker);

    if (index === -1) {
        return null;
    }

    return name.slice(0, index).trim() || null;
}

function buildShortInsightName(name) {
    if (typeof name !== "string") return null;

    if (name === "Salvation Pass Mastery") {
        return "Mastery";
    }

    const marker = " Insight:";
    const index = name.indexOf(marker);

    if (index === -1) {
        return null;
    }

    return name.slice(index + marker.length).trim() || null;
}

function isTrueMapInsight(entry) {
    const name = normaliseText(entry?.name);
    const requirement = normaliseText(entry?.requirement);

    if (!name) {
        return false;
    }

    // Standard insight pattern:
    // "<Map Name> Insight: <Location Name>"
    if (name.includes(" Insight: ")) {
        const mapName = buildMapNameFromInsightAchievementName(name);
        const shortName = buildShortInsightName(name);

        return Boolean(mapName && shortName);
    }

    // Special-case insight achievements that do not follow the normal title pattern.
    // Salvation Pass Mastery is a valid mastery insight source.
    if (name === "Salvation Pass Mastery") {
        return true;
    }

    // Optional future-proof fallback for similar weird insight entries.
    if (
        requirement &&
        requirement.toLowerCase().includes("channel the") &&
        requirement.toLowerCase().includes("mastery insight")
    ) {
        return true;
    }

    return false;
}

function buildWikiUrl(name) {
    if (typeof name !== "string") return null;

    const trimmed = name.trim();
    if (!trimmed) return null;

    return `https://wiki.guildwars2.com/wiki/${trimmed.replaceAll(" ", "_")}`;
}

function dedupeInsights(insights) {
    const seen = new Map();

    for (const entry of insights) {
        const key = entry.masteryPointId;

        if (!Number.isInteger(key)) {
            continue;
        }

        if (!seen.has(key)) {
            seen.set(key, entry);
            continue;
        }

        const existing = seen.get(key);

        const existingScore =
            (existing.name ? 1 : 0) +
            (existing.shortName ? 1 : 0) +
            (existing.mapName ? 1 : 0) +
            (existing.requirement ? 1 : 0) +
            (existing.regionName ? 1 : 0);

        const currentScore =
            (entry.name ? 1 : 0) +
            (entry.shortName ? 1 : 0) +
            (entry.mapName ? 1 : 0) +
            (entry.requirement ? 1 : 0) +
            (entry.regionName ? 1 : 0);

        if (currentScore > existingScore) {
            seen.set(key, entry);
        }
    }

    return [...seen.values()];
}

function countByExpansion(entries) {
    const counts = new Map();

    for (const entry of entries) {
        const key = entry.expansion ?? "Unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Object.fromEntries(
        [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
}

function countByMap(entries) {
    const counts = new Map();

    for (const entry of entries) {
        const key = entry.mapName ?? "Unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Object.fromEntries(
        [...counts.entries()].sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        }),
    );
}

async function main() {
    console.log("Reading mastery achievements...");
    const masteryAchievements = await readJson(ACHIEVEMENTS_FILE);

    const skippedEntries = [];
    const rawInsights = [];

    for (const entry of masteryAchievements) {
        const masteryPointId = entry?.rewardRaw?.id ?? null;

        if (!Number.isInteger(masteryPointId)) {
            continue;
        }

        const name = normaliseText(entry?.name);
        const requirement = normaliseText(entry?.requirement);

        // Skip things like "Thirsty Tourist".
        if (!isTrueMapInsight(entry)) {
            if (
                name &&
                requirement &&
                requirement.toLowerCase().includes("insight")
            ) {
                skippedEntries.push({
                    masteryPointId,
                    achievementId: entry?.achievementId ?? null,
                    name,
                    requirement,
                    region: entry?.region ?? entry?.rewardRaw?.region ?? null,
                });
            }
            continue;
        }

        const region = entry?.region ?? entry?.rewardRaw?.region ?? null;
        const regionName = normaliseRegionName(region);
        const expansion = buildExpansion(region, regionName);
        const mapName = buildMapNameFromInsightAchievementName(name);
        const shortName = buildShortInsightName(name);
        const wikiUrl = buildWikiUrl(name);

        if (!mapName) {
            continue;
        }

        rawInsights.push({
            masteryPointId,
            achievementId: entry?.achievementId ?? null,
            sourceType: "insight",

            name,
            shortName,
            mapName,

            region,
            regionName,
            expansion,
            wikiUrl,

            description: normaliseText(entry?.description),
            requirement,
            lockedText: normaliseText(entry?.lockedText),

            categoryId: entry?.categoryId ?? null,
            rewardType: entry?.rewardType ?? entry?.rewardRaw?.type ?? null,
            flags: Array.isArray(entry?.flags) ? entry.flags : [],
        });
    }

    const dedupedInsights = dedupeInsights(rawInsights);

    dedupedInsights.sort((a, b) => {
        if ((a.expansion ?? "") !== (b.expansion ?? "")) {
            return (a.expansion ?? "").localeCompare(b.expansion ?? "");
        }

        if ((a.mapName ?? "") !== (b.mapName ?? "")) {
            return (a.mapName ?? "").localeCompare(b.mapName ?? "");
        }

        if ((a.shortName ?? "") !== (b.shortName ?? "")) {
            return (a.shortName ?? "").localeCompare(b.shortName ?? "");
        }

        return (a.masteryPointId ?? 0) - (b.masteryPointId ?? 0);
    });

    const missingMapNameEntries = dedupedInsights.filter((entry) => !entry.mapName);

    const debugPayload = {
        totalInsightEntriesBeforeDedupe: rawInsights.length,
        totalInsightEntriesAfterDedupe: dedupedInsights.length,
        uniqueMasteryPointIds: dedupedInsights.length,
        expansionCounts: countByExpansion(dedupedInsights),
        topMapsByInsightCount: countByMap(dedupedInsights),
        missingMapNameCount: missingMapNameEntries.length,
        missingMapNameEntries,
        skippedCount: skippedEntries.length,
        skippedEntries,
        firstTenInsights: dedupedInsights.slice(0, 10),
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(dedupedInsights, null, 2), "utf8");
    await writeFile(DEBUG_FILE, JSON.stringify(debugPayload, null, 2), "utf8");

    console.log("");
    console.log(`Insight entries before dedupe: ${rawInsights.length}`);
    console.log(`Insight entries after dedupe: ${dedupedInsights.length}`);
    console.log(`Unique mastery point ids: ${dedupedInsights.length}`);
    console.log(`Skipped non-map insight-like entries: ${skippedEntries.length}`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Debug:  ${DEBUG_FILE}`);
}

main().catch((error) => {
    console.error("Build failed:");
    console.error(error);
    process.exit(1);
});