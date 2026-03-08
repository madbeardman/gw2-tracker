import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("public/static/gw2");
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, "mastery-achievements.json");
const INSIGHTS_FILE = path.join(DATA_DIR, "mastery-insights.json");
const OUTPUT_FILE = path.join(DATA_DIR, "mastery-sources.json");
const DEBUG_FILE = path.join(DATA_DIR, "mastery-sources-debug.json");

const REGION_EXPANSION_MAP = {
    Tyria: "Central Tyria",
    Maguuma: "Heart of Thorns",
    Desert: "Path of Fire",
    Tundra: "Icebrood Saga",
    Jade: "End of Dragons",
    Sky: "Secrets of the Obscure",
    Wild: "Janthir Wilds",
    Magic: "Visions of Eternity",
};

const EXPECTED_EXPANSION_TOTALS = {
    "Central Tyria": 84,
    "Heart of Thorns": 198,
    "Path of Fire": 130,
    "Icebrood Saga": 76,
    "End of Dragons": 115,
    "Secrets of the Obscure": 103,
    "Janthir Wilds": 115,
    "Visions of Eternity": 45,
};

async function readJson(filePath) {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
}

function countByExpansion(entries) {
    const counts = new Map();

    for (const entry of entries) {
        const key = entry.expansion ?? "Unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function buildExpansionDiff(actualCounts) {
    const diff = {};

    for (const [expansion, expected] of Object.entries(EXPECTED_EXPANSION_TOTALS)) {
        const actual = actualCounts[expansion] ?? 0;
        diff[expansion] = {
            expected,
            actual,
            missing: expected - actual,
        };
    }

    return diff;
}

function normaliseText(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getExpansion(region, regionName) {
    if (region && REGION_EXPANSION_MAP[region]) {
        return REGION_EXPANSION_MAP[region];
    }

    if (regionName) {
        return regionName;
    }

    return null;
}

function buildAchievementMap(achievements) {
    const map = new Map();

    for (const entry of achievements) {
        const masteryPointId =
            entry.masteryPointId ??
            entry.rewardRaw?.id ??
            null;

        if (masteryPointId == null) {
            continue;
        }

        if (!map.has(masteryPointId)) {
            map.set(masteryPointId, []);
        }

        map.get(masteryPointId).push({
            masteryPointId,
            achievementId: entry.achievementId ?? null,
            name: normaliseText(entry.name),
            description: normaliseText(entry.description),
            requirement: normaliseText(entry.requirement),
            lockedText: normaliseText(entry.lockedText),
            categoryId: entry.categoryId ?? null,
            region: entry.region ?? entry.rewardRaw?.region ?? null,
            rewardType: entry.rewardType ?? entry.rewardRaw?.type ?? null,
            flags: Array.isArray(entry.flags) ? entry.flags : [],
        });
    }

    return map;
}

function buildInsightMap(insights) {
    const map = new Map();

    for (const entry of insights) {
        const masteryPointId = entry.masteryPointId ?? null;

        if (masteryPointId == null) {
            continue;
        }

        if (!map.has(masteryPointId)) {
            map.set(masteryPointId, []);
        }

        map.get(masteryPointId).push({
            masteryPointId,
            region: entry.region ?? null,
            regionName: entry.regionName ?? null,
            continentId: entry.continentId ?? null,
            continentName: entry.continentName ?? null,
            floorId: entry.floorId ?? null,
            regionId: entry.regionId ?? null,
            regionMapName: entry.regionMapName ?? null,
            mapId: entry.mapId ?? null,
            mapName: entry.mapName ?? null,
            mapMinLevel: entry.mapMinLevel ?? null,
            mapMaxLevel: entry.mapMaxLevel ?? null,
            coord: Array.isArray(entry.coord) ? entry.coord : null,
        });
    }

    return map;
}

function choosePreferredAchievement(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return null;
    }

    const sorted = [...entries].sort((a, b) => {
        const aHasRequirement = a.requirement ? 1 : 0;
        const bHasRequirement = b.requirement ? 1 : 0;

        if (aHasRequirement !== bHasRequirement) {
            return bHasRequirement - aHasRequirement;
        }

        const aHasName = a.name ? 1 : 0;
        const bHasName = b.name ? 1 : 0;

        if (aHasName !== bHasName) {
            return bHasName - aHasName;
        }

        return (a.achievementId ?? 0) - (b.achievementId ?? 0);
    });

    return sorted[0];
}

function choosePreferredInsight(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return null;
    }

    const sorted = [...entries].sort((a, b) => {
        const aHasMap = a.mapName ? 1 : 0;
        const bHasMap = b.mapName ? 1 : 0;

        if (aHasMap !== bHasMap) {
            return bHasMap - aHasMap;
        }

        return (a.mapId ?? 0) - (b.mapId ?? 0);
    });

    return sorted[0];
}

function buildMergedEntry(masteryPointId, achievementEntries, insightEntries) {
    const bestAchievement = choosePreferredAchievement(achievementEntries);
    const bestInsight = choosePreferredInsight(insightEntries);

    const isInsight = Array.isArray(insightEntries) && insightEntries.length > 0;

    const region = bestInsight?.region ?? bestAchievement?.region ?? null;
    const regionName = bestInsight?.regionName ?? null;
    const expansion = getExpansion(region, regionName);

    return {
        masteryPointId,
        sourceType: isInsight ? "insight" : "achievement",

        region,
        regionName,
        expansion,

        name: bestAchievement?.name ?? null,
        description: bestAchievement?.description ?? null,
        requirement: bestAchievement?.requirement ?? null,
        lockedText: bestAchievement?.lockedText ?? null,

        achievementId: bestAchievement?.achievementId ?? null,
        categoryId: bestAchievement?.categoryId ?? null,
        rewardType: bestAchievement?.rewardType ?? null,
        flags: bestAchievement?.flags ?? [],

        mapId: bestInsight?.mapId ?? null,
        mapName: bestInsight?.mapName ?? null,
        mapMinLevel: bestInsight?.mapMinLevel ?? null,
        mapMaxLevel: bestInsight?.mapMaxLevel ?? null,
        coord: bestInsight?.coord ?? null,

        regionId: bestInsight?.regionId ?? null,
        regionMapName: bestInsight?.regionMapName ?? null,
        continentId: bestInsight?.continentId ?? null,
        continentName: bestInsight?.continentName ?? null,
        floorId: bestInsight?.floorId ?? null,

        hasAchievementLink: Array.isArray(achievementEntries) && achievementEntries.length > 0,
        hasInsightLink: isInsight,
        achievementLinkCount: Array.isArray(achievementEntries) ? achievementEntries.length : 0,
        insightLinkCount: Array.isArray(insightEntries) ? insightEntries.length : 0,
    };
}

async function main() {
    console.log("Reading mastery achievements...");
    const masteryAchievements = await readJson(ACHIEVEMENTS_FILE);

    console.log("Reading mastery insights...");
    const masteryInsights = await readJson(INSIGHTS_FILE);

    const achievementMap = buildAchievementMap(masteryAchievements);
    const insightMap = buildInsightMap(masteryInsights);

    const allMasteryPointIds = new Set([
        ...achievementMap.keys(),
        ...insightMap.keys(),
    ]);

    const merged = [];

    for (const masteryPointId of allMasteryPointIds) {
        const achievementEntries = achievementMap.get(masteryPointId) ?? [];
        const insightEntries = insightMap.get(masteryPointId) ?? [];

        merged.push(
            buildMergedEntry(masteryPointId, achievementEntries, insightEntries)
        );
    }

    merged.sort((a, b) => {

        // 1️⃣ expansion grouping (Central Tyria, HoT, PoF etc)
        if (a.expansion !== b.expansion) {
            return (a.expansion ?? "").localeCompare(b.expansion ?? "");
        }

        // 2️⃣ region grouping
        const regionA = a.regionName ?? a.region ?? "";
        const regionB = b.regionName ?? b.region ?? "";

        if (regionA !== regionB) {
            return regionA.localeCompare(regionB);
        }

        // 3️⃣ insight before achievement
        if (a.sourceType !== b.sourceType) {
            return a.sourceType.localeCompare(b.sourceType);
        }

        // 4️⃣ map name
        if ((a.mapName ?? "") !== (b.mapName ?? "")) {
            return (a.mapName ?? "").localeCompare(b.mapName ?? "");
        }

        // 5️⃣ achievement / insight name
        if ((a.name ?? "") !== (b.name ?? "")) {
            return (a.name ?? "").localeCompare(b.name ?? "");
        }

        // 6️⃣ fallback
        return (a.masteryPointId ?? 0) - (b.masteryPointId ?? 0);
    });

    const expansionCounts = countByExpansion(merged);
    const expansionDiff = buildExpansionDiff(expansionCounts);

    const unknownEntries = merged.filter((entry) => !entry.expansion);

    const debugPayload = {
        achievementEntriesRead: masteryAchievements.length,
        insightEntriesRead: masteryInsights.length,
        uniqueAchievementMasteryPointIds: achievementMap.size,
        uniqueInsightMasteryPointIds: insightMap.size,
        mergedEntries: merged.length,
        expansionCounts,
        expansionDiff,
        unknownCount: unknownEntries.length,
        unknownEntriesSample: unknownEntries.slice(0, 25),
        firstTenEntries: merged.slice(0, 10),
        expansionCounts: Object.fromEntries(
            merged.reduce((acc, entry) => {
                const key = entry.expansion ?? "Unknown";
                acc.set(key, (acc.get(key) ?? 0) + 1);
                return acc;
            }, new Map())
        ),
    };

    const UNKNOWN_FILE = path.join(DATA_DIR, "mastery-sources-unknown.json");
    await writeFile(UNKNOWN_FILE, JSON.stringify(unknownEntries, null, 2), "utf8");

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(merged, null, 2), "utf8");
    await writeFile(DEBUG_FILE, JSON.stringify(debugPayload, null, 2), "utf8");

    const insightCount = merged.filter((entry) => entry.sourceType === "insight").length;
    const achievementCount = merged.filter((entry) => entry.sourceType === "achievement").length;

    console.log("");
    console.log(`Merged mastery source entries: ${merged.length}`);
    console.log(`Insight entries: ${insightCount}`);
    console.log(`Achievement entries: ${achievementCount}`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Debug:  ${DEBUG_FILE}`);
}

main().catch((error) => {
    console.error("Build failed:");
    console.error(error);
    process.exit(1);
});