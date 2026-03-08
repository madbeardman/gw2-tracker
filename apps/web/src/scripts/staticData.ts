import type { CurrencyMap, IconMap, MasteryDefinition } from "./types";

let currenciesCache: CurrencyMap | null = null;
let masteriesCache: MasteryDefinition[] | null = null;
let professionIconsCache: IconMap | null = null;
let raceIconsCache: IconMap | null = null;

export async function getCurrencies(): Promise<CurrencyMap> {
  if (currenciesCache) return currenciesCache;

  const res = await fetch("/static/gw2/currencies.json");
  if (!res.ok) throw new Error("Could not load currencies.json");

  currenciesCache = (await res.json()) as CurrencyMap;
  return currenciesCache;
}

export async function getMasteries(): Promise<MasteryDefinition[]> {
  if (masteriesCache) return masteriesCache;

  const res = await fetch("/static/gw2/masteries.json");
  if (!res.ok) throw new Error("Could not load masteries.json");

  masteriesCache = (await res.json()) as MasteryDefinition[];
  return masteriesCache;
}

export async function getProfessionIcons(): Promise<IconMap> {
  if (professionIconsCache) return professionIconsCache;

  const res = await fetch("/static/gw2/profession-icons.json");
  if (!res.ok) throw new Error("Could not load profession-icons.json");

  professionIconsCache = (await res.json()) as IconMap;
  return professionIconsCache;
}

export async function getRaceIcons(): Promise<IconMap> {
  if (raceIconsCache) return raceIconsCache;

  const res = await fetch("/static/gw2/race-icons.json");
  if (!res.ok) throw new Error("Could not load race-icons.json");

  raceIconsCache = (await res.json()) as IconMap;
  return raceIconsCache;
}

let masteryPointTotalsCache: Record<string, number> | null = null;

export async function getMasteryPointTotals(): Promise<Record<string, number>> {
  if (masteryPointTotalsCache) return masteryPointTotalsCache;

  const res = await fetch("/static/gw2/mastery-point-totals.json");
  if (!res.ok) throw new Error("Could not load mastery-point-totals.json");

  masteryPointTotalsCache = (await res.json()) as Record<string, number>;
  return masteryPointTotalsCache;
}

export async function getMasteryInsights() {
  const res = await fetch("/static/gw2/mastery-insights.json");
  return res.json();
}

export async function getMasteryAchievementsOnly() {
  const res = await fetch("/static/gw2/mastery-achievements-only.json");
  return res.json();
}
