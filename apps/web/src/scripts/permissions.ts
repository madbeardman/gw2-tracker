import { ALLOWED_PERMISSIONS, PERMISSION_LABELS } from "./constants";
import type { TokenInfo } from "./types";

export function makePermButton(
  permission: string,
  onClick: (permission: string) => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = PERMISSION_LABELS[permission] ?? permission;
  btn.style.padding = "8px 12px";
  btn.style.fontSize = "14px";
  btn.style.cursor = "pointer";
  btn.style.border = "1px solid #ccc";
  btn.style.borderRadius = "6px";
  btn.style.background = "#fff";

  btn.addEventListener("click", () => {
    void onClick(permission);
  });

  return btn;
}

export function renderPermissionLinks(
  token: TokenInfo,
  permLinksEl: HTMLElement,
  onClick: (permission: string) => void,
): void {
  permLinksEl.innerHTML = "";

  const filtered = token.permissions.filter((p) => ALLOWED_PERMISSIONS.has(p));

  if (filtered.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = "No enabled permissions available for this key (yet).";
    msg.style.margin = "0";
    msg.style.opacity = "0.8";
    permLinksEl.appendChild(msg);
    return;
  }

  for (const perm of filtered) {
    permLinksEl.appendChild(makePermButton(perm, onClick));
  }
}
