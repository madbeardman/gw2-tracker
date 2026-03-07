import { getCurrencies } from "../staticData";
import { WALLET_PINNED_NAMES } from "../constants";
import { formatCoin } from "../formatters";
import type { WalletEntry } from "../types";
import type { UIContext } from "../uiContext";

function pinnedRank(name: string): number {
  const idx = WALLET_PINNED_NAMES.indexOf(name);
  return idx === -1 ? 9999 : idx;
}

export async function showWallet(ctx: UIContext): Promise<void> {
  ctx.characterHeaderEl.style.display = "none";
  ctx.professionIconEl.style.display = "none";
  ctx.raceIconEl.style.display = "none";

  try {
    ctx.setLoading("Fetching wallet…");

    const [walletRaw, currencies] = await Promise.all([
      ctx.fetchJson("/api/account/wallet"),
      getCurrencies(),
    ]);

    const wallet = walletRaw as WalletEntry[];
    const HIDE_ZERO = false;

    const enriched = wallet
      .map((w) => {
        const info = currencies[String(w.id)] ?? { name: `Currency #${w.id}` };
        return { ...w, info };
      })
      .filter((e) => !HIDE_ZERO || e.value !== 0)
      .sort((a, b) => {
        const prA = pinnedRank(a.info.name);
        const prB = pinnedRank(b.info.name);
        if (prA !== prB) return prA - prB;

        const oA = a.info.order ?? 9999;
        const oB = b.info.order ?? 9999;
        if (oA !== oB) return oA - oB;

        const n = a.info.name.localeCompare(b.info.name);
        if (n !== 0) return n;
        return a.id - b.id;
      });

    ctx.walletListEl.innerHTML = "";
    ctx.jsonEl.style.display = "none";
    ctx.walletListEl.style.display = "block";

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.padding = "12px";
    wrapper.style.background = "#f6f6f6";
    wrapper.style.borderRadius = "8px";
    wrapper.style.gap = "6px";

    for (const e of enriched) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "10px";
      left.style.minWidth = "0";

      if (e.info.icon) {
        const img = document.createElement("img");
        img.src = e.info.icon;
        img.alt = "";
        img.width = 20;
        img.height = 20;
        img.loading = "lazy";
        img.decoding = "async";
        img.style.flex = "0 0 auto";
        img.style.borderRadius = "4px";
        left.appendChild(img);
      } else {
        const spacer = document.createElement("div");
        spacer.style.width = "20px";
        spacer.style.height = "20px";
        left.appendChild(spacer);
      }

      const name = document.createElement("div");
      name.textContent = e.info.name;
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.style.fontWeight = "600";
      left.appendChild(name);

      const value = document.createElement("div");
      value.style.marginLeft = "auto";
      value.style.minWidth = "110px";
      value.style.textAlign = "right";
      value.style.fontFamily =
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      value.style.whiteSpace = "nowrap";

      value.textContent =
        e.id === 1 ? formatCoin(e.value) : e.value.toLocaleString();

      row.appendChild(left);
      row.appendChild(value);
      wrapper.appendChild(row);
    }

    ctx.walletListEl.appendChild(wrapper);
  } catch (e: unknown) {
    ctx.showPre();
    if (e instanceof Error) ctx.showError(e.message);
    else ctx.showError("Unknown error occurred.");
  }
}
