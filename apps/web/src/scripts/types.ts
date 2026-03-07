export type TokenInfo = {
  id: string;
  name: string;
  permissions: string[];
};

export type WalletEntry = {
  id: number;
  value: number;
};

export type CurrencyInfo = {
  name: string;
  icon?: string;
  description?: string;
  order?: number;
};

export type CurrencyMap = Record<string, CurrencyInfo>;

export type IconInfo = {
  icon?: string;
  big_icon?: string;
};

export type IconMap = Record<string, IconInfo>;

export type AccountMastery = {
  id: number;
  level: number;
};

export type AccountMasteryPoints = {
  region: string;
  spent: number;
  earned: number;
};

export type MasteryDefinitionLevel = {
  name: string;
  description: string;
  instruction: string;
  icon: string;
  point_cost: number;
  exp_cost: number;
};

export type MasteryDefinition = {
  id: number;
  name: string;
  requirement: string;
  order: number;
  background: string;
  region: string;
  levels: MasteryDefinitionLevel[];
};

export type AccountMasteryPointsResponse = {
  totals: AccountMasteryPoints[];
  unlocked?: number[];
};
