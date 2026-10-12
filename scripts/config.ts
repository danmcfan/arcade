// The one place scripts get the dev server URL from (§2): honors
// ARCADE_PORT like the `dev` script in package.json (default 3000).

export const ARCADE_PORT = Number(process.env.ARCADE_PORT ?? 3000);
export const ARCADE_URL = `http://localhost:${ARCADE_PORT}`;
