const GW2_BASE = "https://api.guildwars2.com";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function withCors(resp: Response, origin: string | null) {
  const headers = new Headers(resp.headers);
  // Dev-friendly CORS (tighten later)
  headers.set("access-control-allow-origin", origin ?? "*");
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-allow-methods", "GET,OPTIONS");
  headers.set("access-control-max-age", "86400");
  return new Response(resp.body, { status: resp.status, headers });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    const url = new URL(request.url);

    console.log(
      `${request.method} pathname=${JSON.stringify(url.pathname)} full=${request.url}`,
    );

    // GET /api/tokeninfo  (expects Authorization: Bearer <API_KEY>)
    if (url.pathname === "/api/tokeninfo") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      // IMPORTANT: do NOT cache account/token-specific calls
      const upstream = await fetch(`${GW2_BASE}/v2/tokeninfo`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      // pass through status + JSON
      const resp = new Response(bodyText, {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") ??
            "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });

      return withCors(resp, origin);
    }

    // GET /api/account/mounts (requires 'unlocks')
    if (url.pathname === "/api/account/mounts") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/mounts`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/mounts/types (requires 'unlocks')
    if (url.pathname === "/api/account/mounts/types") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/mounts/types`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/mounts/skins (requires 'unlocks')
    if (url.pathname === "/api/account/mounts/skins") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/mounts/skins`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/wallet (requires 'wallet')
    if (url.pathname === "/api/account/wallet") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/wallet`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/characters (requires 'characters')
    if (url.pathname === "/api/account/characters") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/characters`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/characters/:name (requires 'characters')
    if (url.pathname.startsWith("/api/account/characters/")) {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const name = decodeURIComponent(
        url.pathname.slice("/api/account/characters/".length),
      );
      if (!name) {
        return withCors(
          json({ error: "Missing character name" }, { status: 400 }),
          origin,
        );
      }

      const upstream = await fetch(
        `${GW2_BASE}/v2/characters/${encodeURIComponent(name)}`,
        {
          headers: { Authorization: auth },
        },
      );

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/achievements (requires 'progression')
    if (url.pathname === "/api/account/achievements") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/achievements`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/masteries (requires 'progression')
    if (url.pathname === "/api/account/masteries") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/masteries`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    // GET /api/account/mastery/points (requires 'progression')
    if (url.pathname === "/api/account/mastery/points") {
      const auth = request.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return withCors(
          json(
            { error: "Missing Authorization: Bearer <API_KEY>" },
            { status: 401 },
          ),
          origin,
        );
      }

      const upstream = await fetch(`${GW2_BASE}/v2/account/mastery/points`, {
        headers: { Authorization: auth },
      });

      const bodyText = await upstream.text();

      return withCors(
        new Response(bodyText, {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ??
              "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        }),
        origin,
      );
    }

    return withCors(
      json({ error: "Not found - get in" }, { status: 404 }),
      origin,
    );
  },
};
