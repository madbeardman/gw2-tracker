export async function fetchJsonWithKey(
  path: string,
  key: string | null,
): Promise<unknown> {
  if (!key) throw new Error("No API key stored.");

  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${key}` },
  });

  const text = await res.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? String(
            (data as { error?: unknown }).error ??
              `Request failed (${res.status}).`,
          )
        : `Request failed (${res.status}).`;

    throw new Error(msg);
  }

  return data;
}
