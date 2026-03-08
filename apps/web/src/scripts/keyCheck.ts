import { renderPermissionLinks } from "./permissions";
import { byId } from "./dom";
import { showWallet } from "./features/wallet";
import { fetchJsonWithKey } from "./api";

import type { TokenInfo } from "./types";
import type { UIContext } from "./uiContext";

import { showCharacterNames } from "./features/characters";
import { showMasteries } from "./features/masteries";
import { renderUnlocksSublinks } from "./features/unlocks";

export function initKeyCheck(): void {
  const apiKeyEl = byId<HTMLInputElement>("apiKey");
  const submitBtn = byId<HTMLButtonElement>("submitBtn");
  const formWrap = byId<HTMLElement>("form-wrap");
  const errorEl = byId<HTMLElement>("error");

  const resultWrap = byId<HTMLElement>("result");
  const jsonEl = byId<HTMLElement>("json");
  const resetBtn = byId<HTMLButtonElement>("resetBtn");
  const permLinksEl = byId<HTMLElement>("permLinks");
  const walletListEl = byId<HTMLElement>("walletList");
  const characterHeaderEl = byId<HTMLElement>("characterHeader");
  const professionIconEl = byId<HTMLImageElement>("professionIcon");
  const raceIconEl = byId<HTMLImageElement>("raceIcon");
  const characterTitleEl = byId<HTMLElement>("characterTitle");
  const characterSubtitleEl = byId<HTMLElement>("characterSubtitle");

  let currentKey: string | null = null;
  let lastTokenInfo: TokenInfo | null = null;

  const ctx: UIContext = {
    jsonEl,
    walletListEl,
    permLinksEl,
    errorEl,

    characterHeaderEl,
    professionIconEl,
    raceIconEl,
    characterTitleEl,
    characterSubtitleEl,

    getCurrentKey: () => currentKey,
    getLastTokenInfo: () => lastTokenInfo,

    showPre,
    showError,
    clearError,
    setJson,
    setTextBlock,
    setHtmlBlock,
    setLoading,

    fetchJson,
    renderTopLevelPermissions,
    makeActionButton,
  };

  function showPre(): void {
    walletListEl.style.display = "none";
    jsonEl.style.display = "block";
  }

  function setTextBlock(lines: string[]): void {
    showPre();
    jsonEl.textContent = lines.join("\n");
  }

  function setHtmlBlock(html: string) {
    jsonEl.innerHTML = html;
  }

  function renderTopLevelPermissions(): void {
    if (!lastTokenInfo) {
      permLinksEl.innerHTML = "";
      return;
    }

    renderPermissionLinks(lastTokenInfo, permLinksEl, fetchPermission);
  }

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.style.display = "block";
  }

  function clearError(): void {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }

  function setJson(data: unknown): void {
    showPre();
    jsonEl.textContent = JSON.stringify(data, null, 2);
  }

  function setLoading(label = "Loading…"): void {
    showPre();
    jsonEl.textContent = label;
  }

  function resetView(): void {
    currentKey = null;
    lastTokenInfo = null;
    apiKeyEl.value = "";
    resultWrap.style.display = "none";
    formWrap.style.display = "block";
    permLinksEl.innerHTML = "";
    walletListEl.innerHTML = "";
    walletListEl.style.display = "none";
    jsonEl.style.display = "block";
    clearError();
    apiKeyEl.focus();
  }

  function makeActionButton(
    label: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.padding = "8px 12px";
    btn.style.fontSize = "14px";
    btn.style.cursor = "pointer";
    btn.style.border = "1px solid #ccc";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.addEventListener("click", onClick);
    return btn;
  }

  async function fetchJson(path: string): Promise<unknown> {
    return fetchJsonWithKey(path, currentKey);
  }

  async function checkKey(): Promise<void> {
    clearError();

    const key = apiKeyEl.value.trim();
    if (!key) {
      showError("Please enter an API key.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Checking…";

    try {
      currentKey = key;
      setLoading("Fetching token info…");

      const data = await fetchJson("/api/tokeninfo");
      const tokenInfo = data as TokenInfo;

      lastTokenInfo = tokenInfo;
      setJson(data);

      renderPermissionLinks(lastTokenInfo, permLinksEl, fetchPermission);

      formWrap.style.display = "none";
      resultWrap.style.display = "block";
    } catch (e: unknown) {
      currentKey = null;
      if (e instanceof Error) showError(e.message);
      else showError("Unknown error occurred.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Check key";
    }
  }

  async function fetchPermission(permission: string): Promise<void> {
    clearError();

    if (permission === "unlocks") {
      renderUnlocksSublinks(ctx);
      return;
    }

    if (permission === "wallet") {
      await showWallet(ctx);
      return;
    }

    if (permission === "characters") {
      await showCharacterNames(ctx);
      return;
    }

    if (permission === "progression") {
      await showMasteries(ctx);
      return;
    }

    showError(`No handler for permission: ${permission}`);
  }

  submitBtn.addEventListener("click", () => void checkKey());
  apiKeyEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") void checkKey();
  });

  resetBtn.addEventListener("click", resetView);
}
