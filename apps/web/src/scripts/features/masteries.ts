import { getMasteries, getMasteryPointTotals } from "../staticData";
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

function getDisplayRegion(region: string): string {
  return REGION_DISPLAY_MAP[region] ?? region;
}

function getRegionSortIndex(region: string): number {
  const idx = REGION_ORDER.indexOf(region);
  return idx === -1 ? 999 : idx;
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
    ] = await Promise.all([
      ctx.fetchJson("/api/account/masteries"),
      ctx.fetchJson("/api/account/mastery/points"),
      getMasteries(),
      getMasteryPointTotals(),
    ]);

    const accountMasteries = accountMasteriesRaw as AccountMastery[];
    const masteryPointsResponse =
      masteryPointsRaw as AccountMasteryPointsResponse;
    const masteryPoints = masteryPointsResponse.totals ?? [];
    const definitions = definitionsRaw as MasteryDefinition[];

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

      lines.push(displayRegion);
      lines.push("-".repeat(displayRegion.length));

      const pointsRegion = getDisplayRegion(region);
      const regionPoints = masteryPoints.find((p) => p.region === pointsRegion);
      const totalAvailable = regionTotals[pointsRegion];

      if (regionPoints) {
        const unspent = regionPoints.earned - regionPoints.spent;

        if (typeof totalAvailable === "number") {
          const stillUnlockable = totalAvailable - regionPoints.earned;

          lines.push(
            `Mastery Points: ${totalAvailable} total / ${regionPoints.earned} earned / ${regionPoints.spent} spent / ${unspent} unspent / ${stillUnlockable} still unlockable`,
          );
        } else {
          lines.push(
            `Mastery Points: ${regionPoints.earned} earned / ${regionPoints.spent} spent / ${unspent} unspent`,
          );
        }
      } else {
        if (typeof totalAvailable === "number") {
          lines.push(
            `Mastery Points: ${totalAvailable} total / No account data`,
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
          lines.push(`• ${def.name} — complete`);
        } else {
          const nextLevel = def.levels[currentLevel];
          lines.push(`• ${def.name} — ${currentLevel}/${maxLevel}`);

          if (nextLevel?.name) {
            lines.push(`  Next: ${nextLevel.name}`);
          }
        }
      }

      lines.push("");
    }

    if (lines.length === 0) {
      ctx.setTextBlock(["No mastery data could be rendered."]);
      return;
    }

    ctx.setTextBlock(lines);
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
