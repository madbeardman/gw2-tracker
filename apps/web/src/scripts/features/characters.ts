import { getProfessionIcons, getRaceIcons } from "../staticData";
import { formatPlaytime } from "../formatters";
import type { UIContext } from "../uiContext";

type CharacterSummary = {
  name: string;
  race: string;
  gender: string;
  profession: string;
  level: number;
  created: string;
  deaths: number;
  age: number;
};

function hideCharacterHeader(ctx: UIContext): void {
  ctx.characterHeaderEl.style.display = "none";
  ctx.professionIconEl.style.display = "none";
  ctx.raceIconEl.style.display = "none";
  ctx.professionIconEl.src = "";
  ctx.raceIconEl.src = "";
  ctx.characterTitleEl.textContent = "";
  ctx.characterSubtitleEl.textContent = "";
}

async function showCharacterHeader(
  ctx: UIContext,
  character: {
    name: string;
    profession: string;
    race: string;
    gender: string;
    level: number;
  },
): Promise<void> {
  ctx.characterHeaderEl.style.display = "flex";
  ctx.characterTitleEl.textContent = character.name;
  ctx.characterSubtitleEl.textContent = `${character.race} • ${character.gender} • ${character.profession} • Level ${character.level}`;

  const [profIcons, raceIcons] = await Promise.all([
    getProfessionIcons(),
    getRaceIcons(),
  ]);

  const prof = profIcons[character.profession];
  const race = raceIcons[character.race];

  if (prof?.icon) {
    ctx.professionIconEl.src = prof.icon;
    ctx.professionIconEl.alt = `${character.profession} icon`;
    ctx.professionIconEl.style.display = "block";
  } else {
    ctx.professionIconEl.style.display = "none";
  }

  if (race?.icon) {
    ctx.raceIconEl.src = race.icon;
    ctx.raceIconEl.alt = `${character.race} icon`;
    ctx.raceIconEl.style.display = "block";
  } else {
    ctx.raceIconEl.style.display = "none";
  }
}

export async function showCharacterSummary(
  ctx: UIContext,
  name: string,
): Promise<void> {
  try {
    ctx.setLoading(`Fetching ${name}…`);

    const data = await ctx.fetchJson(
      `/api/account/characters/${encodeURIComponent(name)}`,
    );

    const character = data as CharacterSummary;

    await showCharacterHeader(ctx, {
      name: character.name,
      profession: character.profession,
      race: character.race,
      gender: character.gender,
      level: character.level,
    });

    const lines = [
      `Name: ${character.name}`,
      `Profession: ${character.profession} (Level ${character.level})`,
      `Race/Gender: ${character.race} / ${character.gender}`,
      `Created: ${new Date(character.created).toLocaleString()}`,
      `Deaths: ${character.deaths.toLocaleString()}`,
      `Playtime: ${formatPlaytime(character.age)}`,
      ``,
      `Tip: click again for raw JSON (or we add a toggle).`,
    ];

    ctx.setTextBlock(lines);
  } catch (e: unknown) {
    if (e instanceof Error) ctx.showError(e.message);
    else ctx.showError("Unknown error occurred.");
  }
}

export async function showCharacterNames(ctx: UIContext): Promise<void> {
  hideCharacterHeader(ctx);

  try {
    ctx.setLoading("Fetching character names…");

    const namesRaw = await ctx.fetchJson("/api/account/characters");
    const names = namesRaw as string[];

    ctx.permLinksEl.innerHTML = "";

    ctx.permLinksEl.appendChild(
      ctx.makeActionButton("← Back", () => {
        ctx.renderTopLevelPermissions();
      }),
    );

    for (const name of names) {
      ctx.permLinksEl.appendChild(
        ctx.makeActionButton(name, () => {
          void showCharacterSummary(ctx, name);
        }),
      );
    }

    ctx.setLoading("Select a character above…");
  } catch (e: unknown) {
    if (e instanceof Error) ctx.showError(e.message);
    else ctx.showError("Unknown error occurred.");
  }
}

export function resetCharacterHeader(ctx: UIContext): void {
  hideCharacterHeader(ctx);
}
