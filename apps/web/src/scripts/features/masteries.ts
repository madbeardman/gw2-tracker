import {
  getMasteries,
  getMasteryInsights,
  getMasteryPointTotals,
} from "../staticData";
import type {
  AccountMastery,
  AccountMasteryPointsResponse,
  MasteryDefinition,
} from "../types";
import type { UIContext } from "../uiContext";
import { resetCharacterHeader } from "./characters";

const REGION_DISPLAY_MAP: Record<string, string> = {
  Tyria: "Central Tyria",
  Maguuma: "Heart of Thorns",
  Desert: "Path of Fire",
  Tundra: "Icebrood Saga",
  Jade: "End of Dragons",
  Sky: "Secrets of the Obscure",
  Wild: "Janthir Wilds",
  Magic: "Visions of Eternity",
};

const REGION_ORDER = [
  "Central Tyria",
  "Heart of Thorns",
  "Path of Fire",
  "Icebrood Saga",
  "End of Dragons",
  "Secrets of the Obscure",
  "Janthir Wilds",
  "Visions of Eternity",
];

const REGION_ICON_MAP: Record<string, string> = {
  "Central Tyria":
    "/static/gw2/icons/masteries/Mastery_point_(Central_Tyria).png",
  "Heart of Thorns":
    "/static/gw2/icons/masteries/Mastery_point_(Heart_of_Thorns).png",
  "Path of Fire":
    "/static/gw2/icons/masteries/Mastery_point_(Path_of_Fire).png",
  "Icebrood Saga":
    "/static/gw2/icons/masteries/Mastery_point_(Icebrood_Saga).png",
  "End of Dragons":
    "/static/gw2/icons/masteries/Mastery_point_(End_of_Dragons).png",
  "Secrets of the Obscure":
    "/static/gw2/icons/masteries/Mastery_point_(Secrets_of_the_Obscure).png",
  "Janthir Wilds":
    "/static/gw2/icons/masteries/Mastery_point_(Janthir_Wilds).png",
  "Visions of Eternity":
    "/static/gw2/icons/masteries/Mastery_point_(Visions_of_Eternity).png",
};

type MasteryInsightEntry = {
  masteryPointId: number;
  achievementId: number | null;
  sourceType: "insight";
  name: string | null;
  shortName: string | null;
  mapName: string | null;
  region: string | null;
  regionName: string | null;
  expansion: string | null;
  description: string | null;
  requirement: string | null;
  lockedText: string | null;
  categoryId: number | null;
  rewardType: string | null;
  flags: string[];
  wikiUrl?: string | null;
};

function getDisplayRegion(region: string): string {
  return REGION_DISPLAY_MAP[region] ?? region;
}

function getRegionSortIndex(region: string): number {
  const idx = REGION_ORDER.indexOf(region);
  return idx === -1 ? 999 : idx;
}

function getRegionIcon(region: string): string | null {
  return REGION_ICON_MAP[region] ?? null;
}

function groupInsightsByRegionAndMap(
  insights: MasteryInsightEntry[],
): Map<string, Map<string, MasteryInsightEntry[]>> {
  const regions = new Map<string, Map<string, MasteryInsightEntry[]>>();

  for (const insight of insights) {
    const region = insight.regionName ?? "Unknown";
    const map = insight.mapName ?? "Unknown";

    if (!regions.has(region)) {
      regions.set(region, new Map());
    }

    const regionMaps = regions.get(region)!;

    if (!regionMaps.has(map)) {
      regionMaps.set(map, []);
    }

    regionMaps.get(map)!.push(insight);
  }

  return regions;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRegionHeading(region: string): string {
  const safeRegion = escapeHtml(region);
  const icon = getRegionIcon(region);

  if (!icon) {
    return safeRegion;
  }

  return `${safeRegion} <img src="${escapeHtml(
    icon,
  )}" alt="" style="width:24px;height:24px;vertical-align:text-bottom;margin-left:8px;">`;
}

export async function showMasteries(ctx: UIContext): Promise<void> {
  resetCharacterHeader(ctx);
  ctx.showPre();

  try {
    ctx.setLoading("Fetching masteries…");

    const [
      accountMasteriesRaw,
      masteryPointsRaw,
      definitionsRaw,
      regionTotals,
      insightsRaw,
    ] = await Promise.all([
      ctx.fetchJson("/api/account/masteries"),
      ctx.fetchJson("/api/account/mastery/points"),
      getMasteries(),
      getMasteryPointTotals(),
      getMasteryInsights(),
    ]);

    const accountMasteries = accountMasteriesRaw as AccountMastery[];
    const masteryPointsResponse =
      masteryPointsRaw as AccountMasteryPointsResponse;
    const masteryPoints = masteryPointsResponse.totals ?? [];
    const definitions = definitionsRaw as MasteryDefinition[];
    const insights = Array.isArray(insightsRaw)
      ? (insightsRaw as MasteryInsightEntry[])
      : [];
    const unlockedInsights = new Set<number>(
      masteryPointsResponse.unlocked ?? [],
    );

    if (!Array.isArray(definitions) || definitions.length === 0) {
      ctx.setTextBlock(["No mastery definitions were loaded."]);
      return;
    }

    const trainedById = new Map<number, AccountMastery>();
    for (const mastery of accountMasteries) {
      trainedById.set(mastery.id, mastery);
    }

    const grouped = new Map<string, MasteryDefinition[]>();

    for (const def of definitions) {
      if (
        !def ||
        typeof def !== "object" ||
        typeof def.id !== "number" ||
        typeof def.name !== "string" ||
        typeof def.region !== "string" ||
        !Array.isArray(def.levels)
      ) {
        continue;
      }

      const list = grouped.get(def.region) ?? [];
      list.push(def);
      grouped.set(def.region, list);
    }

    const insightsByRegion = groupInsightsByRegionAndMap(insights);

    const sortedRegions = [...grouped.entries()].sort(
      ([regionA], [regionB]) => {
        const displayA = getDisplayRegion(regionA);
        const displayB = getDisplayRegion(regionB);

        const orderA = getRegionSortIndex(displayA);
        const orderB = getRegionSortIndex(displayB);

        if (orderA !== orderB) return orderA - orderB;
        return displayA.localeCompare(displayB);
      },
    );

    const lines: string[] = [];

    for (const [region, defs] of sortedRegions) {
      const displayRegion = getDisplayRegion(region);

      lines.push(renderRegionHeading(displayRegion));
      lines.push(escapeHtml("-".repeat(displayRegion.length)));

      const pointsRegion = getDisplayRegion(region);
      const regionPoints = masteryPoints.find((p) => p.region === pointsRegion);
      const totalAvailable = regionTotals[pointsRegion];

      if (regionPoints) {
        const unspent = regionPoints.earned - regionPoints.spent;

        if (typeof totalAvailable === "number") {
          const stillUnlockable = totalAvailable - regionPoints.earned;

          lines.push(
            escapeHtml(
              `Mastery Points: ${totalAvailable} total / ${regionPoints.earned} earned / ${regionPoints.spent} spent / ${unspent} unspent / ${stillUnlockable} still unlockable`,
            ),
          );
        } else {
          lines.push(
            escapeHtml(
              `Mastery Points: ${regionPoints.earned} earned / ${regionPoints.spent} spent / ${unspent} unspent`,
            ),
          );
        }
      } else {
        if (typeof totalAvailable === "number") {
          lines.push(
            escapeHtml(
              `Mastery Points: ${totalAvailable} total / No account data`,
            ),
          );
        } else {
          lines.push("Mastery Points: No data");
        }
      }

      const sortedDefs = [...defs].sort((a, b) => a.order - b.order);

      for (const def of sortedDefs) {
        const trained = trainedById.get(def.id);
        const currentLevel = trained ? trained.level + 1 : 0;
        const maxLevel = def.levels.length;

        if (currentLevel >= maxLevel) {
          lines.push(escapeHtml(`• ${def.name} — complete`));
        } else {
          const nextLevel = def.levels[currentLevel];
          lines.push(escapeHtml(`• ${def.name} — ${currentLevel}/${maxLevel}`));

          if (nextLevel?.name) {
            lines.push(escapeHtml(`  Next: ${nextLevel.name}`));
          }
        }
      }

      const regionInsights = insightsByRegion.get(displayRegion);

      if (regionInsights && regionInsights.size > 0) {
        let regionInsightTotal = 0;
        let regionInsightUnlocked = 0;

        for (const [, mapInsights] of regionInsights) {
          regionInsightTotal += mapInsights.length;
          regionInsightUnlocked += mapInsights.filter((insight) =>
            unlockedInsights.has(insight.masteryPointId),
          ).length;
        }

        lines.push("");
        lines.push(
          escapeHtml(
            `Insight Mastery — ${regionInsightUnlocked}/${regionInsightTotal}`,
          ),
        );
        lines.push("---------------");

        const sortedMaps = [...regionInsights.entries()].sort(([a], [b]) =>
          a.localeCompare(b),
        );

        for (const [mapName, mapInsights] of sortedMaps) {
          const sortedInsights = [...mapInsights].sort((a, b) =>
            (a.shortName ?? a.name ?? "").localeCompare(
              b.shortName ?? b.name ?? "",
            ),
          );

          const unlockedCount = sortedInsights.filter((insight) =>
            unlockedInsights.has(insight.masteryPointId),
          ).length;
          const totalCount = sortedInsights.length;

          lines.push(escapeHtml(`${mapName} — ${unlockedCount}/${totalCount}`));

          for (const insight of sortedInsights) {
            const unlocked = unlockedInsights.has(insight.masteryPointId);
            const mark = unlocked ? "✓" : "✗";
            const label =
              insight.shortName ?? insight.name ?? "Unknown Insight";
            const color = unlocked ? "#2e7d32" : "#c62828";

            if (!unlocked && insight.wikiUrl) {
              lines.push(
                `  <span style="color:${color}">${escapeHtml(mark)} ${escapeHtml(
                  label,
                )}</span> <a href="${escapeHtml(
                  insight.wikiUrl,
                )}" target="_blank" rel="noopener noreferrer" title="Open wiki page">🔗</a>`,
              );
            } else {
              lines.push(
                `  <span style="color:${color}">${escapeHtml(mark)} ${escapeHtml(
                  label,
                )}</span>`,
              );
            }
          }

          // lines.push("");
        }
      }

      lines.push("");
    }

    ctx.setHtmlBlock(
      `<pre class="masteries-view" style="margin: 0; white-space: pre-wrap; line-height: 1.45;">${lines.join("\n")}</pre>`,
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("showMasteries failed:", e);
      ctx.showError(e.message);
    } else {
      console.error("showMasteries failed with unknown error:", e);
      ctx.showError("Unknown error occurred.");
    }
  }
}
