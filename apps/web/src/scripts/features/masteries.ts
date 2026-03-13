import {
  getMasteries,
  getMasteryAchievementsOnly,
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

type MasteryAchievementEntry = {
  masteryPointId: number;
  achievementId: number | null;
  sourceType: "achievement";
  name: string | null;
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

type AccountAchievementProgress = {
  id: number;
  done?: boolean;
  current?: number;
  max?: number;
  bits?: number[];
};

type RankedAchievementCandidate = {
  entry: MasteryAchievementEntry;
  progress: AccountAchievementProgress | null;
  ratio: number;
  started: boolean;
  detail: string | null;
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

function buildProgressBar(completed: number, total: number, width = 8): string {
  if (total <= 0) {
    return `[${"░".repeat(width)}]`;
  }

  const ratio = completed / total;
  const filled = Math.round(ratio * width);
  const safeFilled = Math.max(0, Math.min(width, filled));
  const empty = width - safeFilled;

  return `[${"█".repeat(safeFilled)}${"░".repeat(empty)}]`;
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

function groupAchievementsByRegion(
  achievements: MasteryAchievementEntry[],
): Map<string, MasteryAchievementEntry[]> {
  const regions = new Map<string, MasteryAchievementEntry[]>();

  for (const achievement of achievements) {
    const region = achievement.regionName ?? "Unknown";
    const list = regions.get(region) ?? [];
    list.push(achievement);
    regions.set(region, list);
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

function renderStatusLine(
  mark: string,
  label: string,
  color: string,
  wikiUrl?: string | null,
  suffix?: string | null,
): string {
  const safeMark = escapeHtml(mark);
  const safeLabel = escapeHtml(label);
  const safeSuffix = suffix ? ` ${escapeHtml(suffix)}` : "";

  if (wikiUrl) {
    return `  <span style="color:${color}">${safeMark} ${safeLabel}${safeSuffix}</span> <a href="${escapeHtml(
      wikiUrl,
    )}" target="_blank" rel="noopener noreferrer" title="Open wiki page">🔗</a>`;
  }

  return `  <span style="color:${color}">${safeMark} ${safeLabel}${safeSuffix}</span>`;
}

function isStartedAchievement(
  progress: AccountAchievementProgress | null,
): boolean {
  if (!progress || progress.done) {
    return false;
  }

  if (typeof progress.current === "number" && progress.current > 0) {
    return true;
  }

  if (Array.isArray(progress.bits) && progress.bits.length > 0) {
    return true;
  }

  return false;
}

function getProgressRatio(progress: AccountAchievementProgress | null): number {
  if (!progress || progress.done) {
    return 0;
  }

  if (
    typeof progress.current === "number" &&
    typeof progress.max === "number" &&
    progress.max > 0
  ) {
    return progress.current / progress.max;
  }

  if (Array.isArray(progress.bits) && progress.bits.length > 0) {
    return 0.01 * progress.bits.length;
  }

  return 0;
}

function getProgressDetail(
  progress: AccountAchievementProgress | null,
): string | null {
  if (!progress || progress.done) {
    return null;
  }

  if (
    typeof progress.current === "number" &&
    typeof progress.max === "number" &&
    progress.max > 0
  ) {
    const percent = Math.round((progress.current / progress.max) * 100);
    return `${progress.current}/${progress.max} (${percent}%)`;
  }

  if (Array.isArray(progress.bits) && progress.bits.length > 0) {
    return `${progress.bits.length} steps`;
  }

  return null;
}

function buildRankedCandidates(
  achievements: MasteryAchievementEntry[],
  progressById: Map<number, AccountAchievementProgress>,
  unlockedMasteryPoints: Set<number>,
): RankedAchievementCandidate[] {
  return achievements
    .filter(
      (achievement) => !unlockedMasteryPoints.has(achievement.masteryPointId),
    )
    .map((achievement) => {
      const progress =
        typeof achievement.achievementId === "number"
          ? (progressById.get(achievement.achievementId) ?? null)
          : null;

      return {
        entry: achievement,
        progress,
        ratio: getProgressRatio(progress),
        started: isStartedAchievement(progress),
        detail: getProgressDetail(progress),
      };
    })
    .sort((a, b) => {
      if (a.started !== b.started) {
        return a.started ? -1 : 1;
      }

      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }

      const aMax =
        typeof a.progress?.max === "number" && a.progress.max > 0
          ? a.progress.max
          : Number.MAX_SAFE_INTEGER;
      const bMax =
        typeof b.progress?.max === "number" && b.progress.max > 0
          ? b.progress.max
          : Number.MAX_SAFE_INTEGER;

      if (aMax !== bMax) {
        return aMax - bMax;
      }

      return (a.entry.name ?? "").localeCompare(b.entry.name ?? "");
    });
}

export async function showMasteries(ctx: UIContext): Promise<void> {
  resetCharacterHeader(ctx);
  ctx.showPre();

  try {
    ctx.setLoading("Fetching masteries…");

    const [
      accountMasteriesRaw,
      masteryPointsRaw,
      accountAchievementsRaw,
      definitionsRaw,
      regionTotals,
      insightsRaw,
      achievementsOnlyRaw,
    ] = await Promise.all([
      ctx.fetchJson("/api/account/masteries"),
      ctx.fetchJson("/api/account/mastery/points"),
      ctx.fetchJson("/api/account/achievements"),
      getMasteries(),
      getMasteryPointTotals(),
      getMasteryInsights(),
      getMasteryAchievementsOnly(),
    ]);

    const accountMasteries = accountMasteriesRaw as AccountMastery[];
    const masteryPointsResponse =
      masteryPointsRaw as AccountMasteryPointsResponse;
    const accountAchievements = Array.isArray(accountAchievementsRaw)
      ? (accountAchievementsRaw as AccountAchievementProgress[])
      : [];
    const masteryPoints = masteryPointsResponse.totals ?? [];
    const definitions = definitionsRaw as MasteryDefinition[];
    const insights = Array.isArray(insightsRaw)
      ? (insightsRaw as MasteryInsightEntry[])
      : [];
    const achievementsOnly = Array.isArray(achievementsOnlyRaw)
      ? (achievementsOnlyRaw as MasteryAchievementEntry[])
      : [];
    const unlockedMasteryPoints = new Set<number>(
      masteryPointsResponse.unlocked ?? [],
    );

    if (!Array.isArray(definitions) || definitions.length === 0) {
      ctx.setTextBlock(["No mastery definitions were loaded."]);
      return;
    }

    const progressByAchievementId = new Map<
      number,
      AccountAchievementProgress
    >();
    for (const achievement of accountAchievements) {
      if (typeof achievement?.id === "number") {
        progressByAchievementId.set(achievement.id, achievement);
      }
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
    const achievementsByRegion = groupAchievementsByRegion(achievementsOnly);

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

    // Heatmap
    lines.push("Mastery Point Heatmap");
    lines.push("---------------------");

    for (const [region] of sortedRegions) {
      const displayRegion = getDisplayRegion(region);
      const regionInsights = insightsByRegion.get(displayRegion);
      const regionAchievements = achievementsByRegion.get(displayRegion) ?? [];

      let regionInsightTotal = 0;
      let regionInsightUnlocked = 0;

      if (regionInsights) {
        for (const [, mapInsights] of regionInsights) {
          regionInsightTotal += mapInsights.length;
          regionInsightUnlocked += mapInsights.filter((insight) =>
            unlockedMasteryPoints.has(insight.masteryPointId),
          ).length;
        }
      }

      const regionAchievementTotal = regionAchievements.length;
      const regionAchievementUnlocked = regionAchievements.filter(
        (achievement) => unlockedMasteryPoints.has(achievement.masteryPointId),
      ).length;

      lines.push(escapeHtml(displayRegion));
      lines.push(
        escapeHtml(
          `  Insights:     ${regionInsightUnlocked}/${regionInsightTotal} ${buildProgressBar(
            regionInsightUnlocked,
            regionInsightTotal,
          )}`,
        ),
      );
      lines.push(
        escapeHtml(
          `  Achievements: ${regionAchievementUnlocked}/${regionAchievementTotal} ${buildProgressBar(
            regionAchievementUnlocked,
            regionAchievementTotal,
          )}`,
        ),
      );
      lines.push("");
    }

    // Next easiest section - option C using account achievement progress
    const nextByRegion = new Map<string, RankedAchievementCandidate[]>();

    for (const [
      regionName,
      regionAchievements,
    ] of achievementsByRegion.entries()) {
      const ranked = buildRankedCandidates(
        regionAchievements,
        progressByAchievementId,
        unlockedMasteryPoints,
      ).filter((candidate) => candidate.started);

      if (ranked.length > 0) {
        nextByRegion.set(regionName, ranked.slice(0, 3));
      }
    }

    if (nextByRegion.size > 0) {
      lines.push("Next Easiest Achievement Mastery Points");
      lines.push("--------------------------------------");

      const sortedNextRegions = [...nextByRegion.entries()].sort(([a], [b]) => {
        const orderA = getRegionSortIndex(a);
        const orderB = getRegionSortIndex(b);

        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });

      for (const [regionName, candidates] of sortedNextRegions) {
        lines.push(escapeHtml(regionName));

        for (const candidate of candidates) {
          const label = candidate.entry.name ?? "Unknown Achievement";
          lines.push(
            renderStatusLine(
              "✗",
              label,
              "#c62828",
              candidate.entry.wikiUrl,
              candidate.detail,
            ),
          );
        }

        lines.push("");
      }
    }

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
            lines.push(
              escapeHtml(
                `  Next: ${nextLevel.name} - ${nextLevel.description} - (${nextLevel.point_cost} points)`,
              ),
            );
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
            unlockedMasteryPoints.has(insight.masteryPointId),
          ).length;
        }

        lines.push("");

        const regionInsightBar =
          regionInsightUnlocked < regionInsightTotal
            ? ` ${buildProgressBar(regionInsightUnlocked, regionInsightTotal)}`
            : "";

        lines.push(
          escapeHtml(
            `Insight Mastery — ${regionInsightUnlocked}/${regionInsightTotal}${regionInsightBar}`,
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
            unlockedMasteryPoints.has(insight.masteryPointId),
          ).length;
          const totalCount = sortedInsights.length;

          const mapProgressBar =
            unlockedCount < totalCount
              ? ` ${buildProgressBar(unlockedCount, totalCount)}`
              : "";

          lines.push(
            escapeHtml(
              `${mapName} — ${unlockedCount}/${totalCount}${mapProgressBar}`,
            ),
          );

          for (const insight of sortedInsights) {
            const unlocked = unlockedMasteryPoints.has(insight.masteryPointId);
            const mark = unlocked ? "✓" : "✗";
            const label =
              insight.shortName ?? insight.name ?? "Unknown Insight";
            const color = unlocked ? "#2e7d32" : "#c62828";

            if (!unlocked && insight.wikiUrl) {
              lines.push(renderStatusLine(mark, label, color, insight.wikiUrl));
            } else {
              lines.push(renderStatusLine(mark, label, color));
            }
          }
        }
      }

      const regionAchievementMasteries =
        achievementsByRegion.get(displayRegion);

      if (regionAchievementMasteries && regionAchievementMasteries.length > 0) {
        const sortedAchievementMasteries = [...regionAchievementMasteries].sort(
          (a, b) => {
            const aUnlocked = unlockedMasteryPoints.has(a.masteryPointId);
            const bUnlocked = unlockedMasteryPoints.has(b.masteryPointId);

            if (aUnlocked !== bUnlocked) return aUnlocked ? 1 : -1;
            return (a.name ?? "").localeCompare(b.name ?? "");
          },
        );

        const achievementUnlockedCount = sortedAchievementMasteries.filter(
          (achievement) =>
            unlockedMasteryPoints.has(achievement.masteryPointId),
        ).length;
        const achievementTotalCount = sortedAchievementMasteries.length;

        lines.push("");

        const achievementProgressBar =
          achievementUnlockedCount < achievementTotalCount
            ? ` ${buildProgressBar(
                achievementUnlockedCount,
                achievementTotalCount,
              )}`
            : "";

        lines.push(
          escapeHtml(
            `Achievement Mastery — ${achievementUnlockedCount}/${achievementTotalCount}${achievementProgressBar}`,
          ),
        );
        lines.push("-------------------");

        for (const achievement of sortedAchievementMasteries) {
          const unlocked = unlockedMasteryPoints.has(
            achievement.masteryPointId,
          );
          const mark = unlocked ? "✓" : "✗";
          const label = achievement.name ?? "Unknown Achievement";
          const color = unlocked ? "#2e7d32" : "#c62828";

          if (!unlocked && achievement.wikiUrl) {
            lines.push(
              renderStatusLine(mark, label, color, achievement.wikiUrl),
            );
          } else {
            lines.push(renderStatusLine(mark, label, color));
          }
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
