import { UNLOCKS_SUBLINKS } from "../constants";
import { resetCharacterHeader } from "./characters";
import type { UIContext } from "../uiContext";

async function fetchAndShow(
  ctx: UIContext,
  path: string,
  label: string,
): Promise<void> {
  ctx.clearError();
  resetCharacterHeader(ctx);

  try {
    ctx.setLoading(`Fetching ${label}…`);
    const data = await ctx.fetchJson(path);
    ctx.setJson(data);
  } catch (e: unknown) {
    if (e instanceof Error) ctx.showError(e.message);
    else ctx.showError("Unknown error occurred.");
  }
}

export function renderUnlocksSublinks(ctx: UIContext): void {
  ctx.permLinksEl.innerHTML = "";

  const backBtn = ctx.makeActionButton("← Back", () => {
    ctx.renderTopLevelPermissions();
  });
  ctx.permLinksEl.appendChild(backBtn);

  for (const link of UNLOCKS_SUBLINKS) {
    const btn = ctx.makeActionButton(link.label, () => {
      void fetchAndShow(ctx, link.path, link.label);
    });
    ctx.permLinksEl.appendChild(btn);
  }

  ctx.setLoading("Pick an unlock category above…");
}
