import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("public/static/gw2");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mastery-achievements-only.json");
const DEBUG_FILE = path.join(
    OUTPUT_DIR,
    "mastery-achievements-only-debug.json",
);

const ACHIEVEMENTS_FILE = path.resolve(
    "public/static/gw2/mastery-achievements.json",
);
const INSIGHTS_FILE = path.resolve("public/static/gw2/mastery-insights.json");

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

function normaliseText(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function normaliseRegionName(region) {
    if (!region) return null;
    return REGION_NAME_MAP[region] ?? region;
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

function buildWikiUrl(name) {
    if (typeof name !== "string") return null;

    const trimmed = name.trim();
    if (!trimmed) return null;

    return `https://wiki.guildwars2.com/wiki/${encodeURIComponent(trimmed).replaceAll("%20", "_")}`;
}

function dedupeAchievements(entries) {
    const seen = new Map();

    for (const entry of entries) {
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
            (existing.requirement ? 1 : 0) +
            (existing.description ? 1 : 0) +
            (existing.lockedText ? 1 : 0);

        const currentScore =
            (entry.name ? 1 : 0) +
            (entry.requirement ? 1 : 0) +
            (entry.description ? 1 : 0) +
            (entry.lockedText ? 1 : 0);

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

async function main() {
    console.log("Reading mastery achievement rewards...");
    const masteryAchievements = await readJson(ACHIEVEMENTS_FILE);

    console.log("Reading mastery insights...");
    const masteryInsights = await readJson(INSIGHTS_FILE);

    const insightIds = new Set(
        masteryInsights
            .map((entry) => entry?.masteryPointId)
            .filter((id) => Number.isInteger(id)),
    );

    const rawAchievementsOnly = masteryAchievements
        .filter((entry) => entry?.rewardType === "Mastery")
        .map((entry) => {
            const masteryPointId = entry?.rewardRaw?.id ?? null;
            const region = entry?.region ?? entry?.rewardRaw?.region ?? null;
            const regionName = normaliseRegionName(region);
            const expansion = buildExpansion(region, regionName);
            const name = normaliseText(entry?.name);

            return {
                masteryPointId,
                achievementId: entry?.achievementId ?? null,
                sourceType: "achievement",

                name,
                region,
                regionName,
                expansion,

                description: normaliseText(entry?.description),
                requirement: normaliseText(entry?.requirement),
                lockedText: normaliseText(entry?.lockedText),

                categoryId: entry?.categoryId ?? null,
                rewardType: entry?.rewardType ?? entry?.rewardRaw?.type ?? null,
                flags: Array.isArray(entry?.flags) ? entry.flags : [],
                wikiUrl: buildWikiUrl(name),
            };
        })
        .filter((entry) => Number.isInteger(entry.masteryPointId))
        .filter((entry) => !insightIds.has(entry.masteryPointId));

    const dedupedAchievementsOnly = dedupeAchievements(rawAchievementsOnly);

    dedupedAchievementsOnly.sort((a, b) => {
        if ((a.expansion ?? "") !== (b.expansion ?? "")) {
            return (a.expansion ?? "").localeCompare(b.expansion ?? "");
        }

        if ((a.name ?? "") !== (b.name ?? "")) {
            return (a.name ?? "").localeCompare(b.name ?? "");
        }

        return (a.masteryPointId ?? 0) - (b.masteryPointId ?? 0);
    });

    const debugPayload = {
        rawMasteryRewardEntries: masteryAchievements.length,
        insightIdsExcluded: insightIds.size,
        achievementOnlyBeforeDedupe: rawAchievementsOnly.length,
        achievementOnlyAfterDedupe: dedupedAchievementsOnly.length,
        expansionCounts: countByExpansion(dedupedAchievementsOnly),
        firstTenEntries: dedupedAchievementsOnly.slice(0, 10),
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(
        OUTPUT_FILE,
        JSON.stringify(dedupedAchievementsOnly, null, 2),
        "utf8",
    );
    await writeFile(DEBUG_FILE, JSON.stringify(debugPayload, null, 2), "utf8");

    console.log("");
    console.log(`Achievement-only entries before dedupe: ${rawAchievementsOnly.length}`);
    console.log(`Achievement-only entries after dedupe: ${dedupedAchievementsOnly.length}`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Debug:  ${DEBUG_FILE}`);
}

main().catch((error) => {
    console.error("Build failed:");
    console.error(error);
    process.exit(1);
});