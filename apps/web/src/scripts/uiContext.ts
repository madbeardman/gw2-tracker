import type { TokenInfo } from "./types";

export type UIContext = {
  jsonEl: HTMLElement;
  walletListEl: HTMLElement;
  permLinksEl: HTMLElement;
  errorEl: HTMLElement;

  characterHeaderEl: HTMLElement;
  professionIconEl: HTMLImageElement;
  raceIconEl: HTMLImageElement;
  characterTitleEl: HTMLElement;
  characterSubtitleEl: HTMLElement;

  getCurrentKey: () => string | null;
  getLastTokenInfo: () => TokenInfo | null;

  showPre: () => void;
  showError: (msg: string) => void;
  clearError: () => void;
  setJson: (data: unknown) => void;
  setTextBlock: (lines: string[]) => void;
  setHtmlBlock: (html: string) => void;
  setLoading: (label?: string) => void;

  fetchJson: (path: string) => Promise<unknown>;
  renderTopLevelPermissions: () => void;
  makeActionButton: (label: string, onClick: () => void) => HTMLButtonElement;
};
