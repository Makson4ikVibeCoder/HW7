/**
 * demo.ts
 *
 * Demonstrates the type-safe API client. This file uses a mock fetch so it
 * can run without a real server (Node 18+ has global fetch built-in).
 */

import { createApiClient, buildUrl, buildQuery } from "./api-client.js";
import type { ApiSchema } from "./api-schema.js";
import type {
  ExtractRouteParams,
  ResponseOf,
  MethodsOf,
  PathsWithMethod,
} from "./types.js";

// ─── Type-level demos ─────────────────────────────────────────────────────────

// ExtractRouteParams ──────────────────────────────────────────────────────────
type PostParams = ExtractRouteParams<"/users/:id/posts/:postId">;
//   ^? { id: string; postId: string }
const _postParams: PostParams = { id: "1", postId: "99" };
console.log("ExtractRouteParams:", _postParams);

// ResponseOf ─────────────────────────────────────────────────────────────────
type SingleUser = ResponseOf<ApiSchema, "/users/:id", "GET">;
//   ^? { id: number; name: string; email: string }
const _sampleUser: SingleUser = { id: 1, name: "Alice", email: "alice@mail.com" };
console.log("ResponseOf /users/:id GET:", _sampleUser);

// MethodsOf ──────────────────────────────────────────────────────────────────
type UserMethods = MethodsOf<ApiSchema, "/users">;
//   ^? "GET" | "POST"
const _method: UserMethods = "GET"; // "DELETE" would be a TS error
console.log("MethodsOf /users:", _method);

// PathsWithMethod ────────────────────────────────────────────────────────────
type PostPaths = PathsWithMethod<ApiSchema, "POST">;
//   ^? "/users"
const _postPath: PostPaths = "/users";
console.log("PathsWithMethod POST:", _postPath);

// ─── Helper function demos ────────────────────────────────────────────────────

console.log("\n── buildUrl ──────────────────────────────────────────");
console.log(buildUrl("/users/:id/posts/:postId", { id: "1", postId: "10" }));
// → /users/1/posts/10

console.log("\n── buildQuery ────────────────────────────────────────");
console.log(buildQuery({ page: 1, limit: 10, search: "angular" }));
// → ?page=1&limit=10&search=angular

// ─── API Client with mock fetch ───────────────────────────────────────────────

// Patch global fetch with a mock so the demo runs without a server
const mockDB = {
  users: [
    { id: 1, name: "Alice", email: "alice@mail.com" },
    { id: 2, name: "Bob", email: "bob@mail.com" },
  ] as { id: number; name: string; email: string }[],
};

let _nextId = 3;

(globalThis as Record<string, unknown>)["fetch"] = async (
  input: string,
  init?: RequestInit
): Promise<Response> => {
  const url = new URL(input, "http://localhost");
  const method = init?.method ?? "GET";
  const pathname = url.pathname;

  let data: unknown;

  if (pathname === "/users" && method === "GET") {
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 10);
    data = mockDB.users.slice((page - 1) * limit, page * limit);
  } else if (pathname === "/users" && method === "POST") {
    const body = JSON.parse((init?.body as string) ?? "{}") as {
      name: string;
      email: string;
    };
    const newUser = { id: _nextId++, ...body };
    mockDB.users.push(newUser);
    data = newUser;
  } else if (/^\/users\/\d+$/.test(pathname) && method === "GET") {
    const id = Number(pathname.split("/")[2]);
    data = mockDB.users.find((u) => u.id === id) ?? null;
  } else if (/^\/users\/\d+$/.test(pathname) && method === "PATCH") {
    const id = Number(pathname.split("/")[2]);
    const body = JSON.parse((init?.body as string) ?? "{}") as Partial<{
      name: string;
      email: string;
    }>;
    const user = mockDB.users.find((u) => u.id === id);
    if (user) Object.assign(user, body);
    data = user;
  } else if (/^\/users\/\d+$/.test(pathname) && method === "DELETE") {
    const id = Number(pathname.split("/")[2]);
    const idx = mockDB.users.findIndex((u) => u.id === id);
    if (idx !== -1) mockDB.users.splice(idx, 1);
    data = { success: true };
  } else {
    data = { error: "Not found" };
  }

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
  } as Response;
};

// ─── Create client with logging middleware ────────────────────────────────────

const client = createApiClient<ApiSchema>({ baseUrl: "http://localhost" });

client.use({
  before: (ctx) => {
    console.log(`\n→ ${ctx.method} ${ctx.path}`);
    return ctx;
  },
  after: (ctx, response) => {
    console.log(`← response:`, JSON.stringify(response, null, 2));
    return response;
  },
  onError: (_ctx, err) => {
    console.error("✗ error:", err);
  },
});

// ─── Run demo ─────────────────────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Type-Safe API Client — Demo");
  console.log("═══════════════════════════════════════════════════");

  // GET /users
  const users = await client.request("/users", "GET", {
    query: { page: 1, limit: 10 },
  });
  // TypeScript knows: users is { id: number; name: string; email: string }[]
  console.log("user count:", users.length);

  // POST /users
  const created = await client.request("/users", "POST", {
    body: { name: "Charlie", email: "charlie@mail.com" },
  });
  console.log("created id:", created.id);

  // GET /users/:id
  const user = await client.request("/users/:id", "GET", {
    params: { id: "1" },
  });
  console.log("fetched user name:", user.name);

  // PATCH /users/:id
  const patched = await client.request("/users/:id", "PATCH", {
    params: { id: "2" },
    body: { email: "bob-new@mail.com" },
  });
  console.log("patched email:", patched.email);

  // DELETE /users/:id
  const deleted = await client.request("/users/:id", "DELETE", {
    params: { id: "1" },
  });
  console.log("deleted success:", deleted.success);

  console.log("\n✅  All demo calls completed successfully.");
}

runDemo().catch(console.error);
