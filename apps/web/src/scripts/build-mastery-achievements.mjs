// src/scripts/build-mastery-achievements.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.guildwars2.com/v2";
const BATCH_SIZE = 200;
const OUTPUT_DIR = path.resolve("public/static/gw2");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mastery-achievements.json");
const DEBUG_FILE = path.join(OUTPUT_DIR, "mastery-achievement-debug.json");

async function fetchJson(url) {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }

    return res.json();
}

function chunk(items, size) {
    const out = [];

    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }

    return out;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseRewardType(type) {
    return String(type ?? "").trim().toLowerCase();
}

function isMasteryReward(reward) {
    const type = normaliseRewardType(reward?.type);

    // Keep this intentionally loose so we can survive API oddities
    return (
        type === "masterypoint" ||
        type === "mastery_point" ||
        type === "mastery" ||
        type.includes("mastery")
    );
}

async function main() {
    console.log("Fetching achievement IDs...");
    const ids = await fetchJson(`${API_BASE}/achievements`);
    console.log(`Found ${ids.length} achievements`);

    const idChunks = chunk(ids, BATCH_SIZE);

    const masteryAchievements = [];
    const rewardTypeCounts = new Map();

    let achievementsWithRewards = 0;
    let achievementsWithMasteryRewards = 0;

    for (let i = 0; i < idChunks.length; i++) {
        const batch = idChunks[i];
        const url = `${API_BASE}/achievements?ids=${batch.join(",")}`;

        console.log(`Fetching batch ${i + 1}/${idChunks.length}`);
        const achievements = await fetchJson(url);

        for (const achievement of achievements) {
            const rewards = Array.isArray(achievement.rewards) ? achievement.rewards : [];

            if (rewards.length > 0) {
                achievementsWithRewards++;
            }

            for (const reward of rewards) {
                const type = String(reward?.type ?? "UNKNOWN");
                rewardTypeCounts.set(type, (rewardTypeCounts.get(type) ?? 0) + 1);
            }

            const masteryRewards = rewards.filter(isMasteryReward);

            if (masteryRewards.length === 0) {
                continue;
            }

            achievementsWithMasteryRewards++;

            for (const reward of masteryRewards) {
                masteryAchievements.push({
                    achievementId: achievement.id,
                    name: achievement.name ?? null,
                    description: achievement.description ?? null,
                    requirement: achievement.requirement ?? null,
                    lockedText: achievement.locked_text ?? null,
                    categoryId: achievement.category ?? null,
                    region: reward.region ?? reward.region_id ?? null,
                    rewardType: reward.type ?? null,
                    rewardRaw: reward,
                    flags: Array.isArray(achievement.flags) ? achievement.flags : [],
                });
            }
        }

        await sleep(150);
    }

    masteryAchievements.sort((a, b) => {
        const regionA = a.region ?? "";
        const regionB = b.region ?? "";

        if (regionA !== regionB) {
            return regionA.localeCompare(regionB);
        }

        return (a.name ?? "").localeCompare(b.name ?? "");
    });

    const rewardTypesSorted = [...rewardTypeCounts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([type, count]) => ({ type, count }));

    const debugPayload = {
        totalAchievements: ids.length,
        achievementsWithRewards,
        achievementsWithMasteryRewards,
        masteryAchievementEntries: masteryAchievements.length,
        rewardTypesSeen: rewardTypesSorted,
        firstTenMasteryEntries: masteryAchievements.slice(0, 10),
    };

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify(masteryAchievements, null, 2), "utf8");
    await writeFile(DEBUG_FILE, JSON.stringify(debugPayload, null, 2), "utf8");

    console.log("");
    console.log(`Achievements with rewards: ${achievementsWithRewards}`);
    console.log(`Achievements with mastery rewards: ${achievementsWithMasteryRewards}`);
    console.log(`Mastery entries written: ${masteryAchievements.length}`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Debug:  ${DEBUG_FILE}`);
}

main().catch((error) => {
    console.error("Build failed:");
    console.error(error);
    process.exit(1);
});