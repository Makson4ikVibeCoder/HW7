/**
 * demo.ts
 *
 * Demonstrates the type-safe API client. This file uses a mock fetch so it
 * can run without a real server (Node 18+ has global fetch built-in).
 */
import { createApiClient, buildUrl, buildQuery } from "./api-client.js";
//   ^? { id: string; postId: string }
const _postParams = { id: "1", postId: "99" };
console.log("ExtractRouteParams:", _postParams);
//   ^? { id: number; name: string; email: string }
const _sampleUser = { id: 1, name: "Alice", email: "alice@mail.com" };
console.log("ResponseOf /users/:id GET:", _sampleUser);
//   ^? "GET" | "POST"
const _method = "GET"; // "DELETE" would be a TS error
console.log("MethodsOf /users:", _method);
//   ^? "/users"
const _postPath = "/users";
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
    ],
};
let _nextId = 3;
globalThis["fetch"] = async (input, init) => {
    const url = new URL(input, "http://localhost");
    const method = init?.method ?? "GET";
    const pathname = url.pathname;
    let data;
    if (pathname === "/users" && method === "GET") {
        const page = Number(url.searchParams.get("page") ?? 1);
        const limit = Number(url.searchParams.get("limit") ?? 10);
        data = mockDB.users.slice((page - 1) * limit, page * limit);
    }
    else if (pathname === "/users" && method === "POST") {
        const body = JSON.parse(init?.body ?? "{}");
        const newUser = { id: _nextId++, ...body };
        mockDB.users.push(newUser);
        data = newUser;
    }
    else if (/^\/users\/\d+$/.test(pathname) && method === "GET") {
        const id = Number(pathname.split("/")[2]);
        data = mockDB.users.find((u) => u.id === id) ?? null;
    }
    else if (/^\/users\/\d+$/.test(pathname) && method === "PATCH") {
        const id = Number(pathname.split("/")[2]);
        const body = JSON.parse(init?.body ?? "{}");
        const user = mockDB.users.find((u) => u.id === id);
        if (user)
            Object.assign(user, body);
        data = user;
    }
    else if (/^\/users\/\d+$/.test(pathname) && method === "DELETE") {
        const id = Number(pathname.split("/")[2]);
        const idx = mockDB.users.findIndex((u) => u.id === id);
        if (idx !== -1)
            mockDB.users.splice(idx, 1);
        data = { success: true };
    }
    else {
        data = { error: "Not found" };
    }
    return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => data,
    };
};
// ─── Create client with logging middleware ────────────────────────────────────
const client = createApiClient({ baseUrl: "http://localhost" });
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
async function runDemo() {
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
