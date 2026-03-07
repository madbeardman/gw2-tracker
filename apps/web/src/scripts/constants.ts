export const ALLOWED_PERMISSIONS = new Set<string>([
  "characters",
  "wallet",
  "unlocks",
  "progression",
]);

export const PERMISSION_LABELS: Record<string, string> = {
  characters: "Characters",
  wallet: "Wallet",
  unlocks: "Unlocks",
  progression: "Masteries",
};

export const UNLOCKS_SUBLINKS: Array<{
  id: string;
  label: string;
  path: string;
}> = [
  {
    id: "mounts_types",
    label: "Mount types",
    path: "/api/account/mounts/types",
  },
  {
    id: "mounts_skins",
    label: "Mount skins",
    path: "/api/account/mounts/skins",
  },
];

export const WALLET_PINNED_NAMES = [
  "Coin",
  "Gem",
  "Karma",
  "Spirit Shard",
  "Laurel",
  "Transmutation Charge",
  "Research Note",
];
