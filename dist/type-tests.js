/**
 * type-tests.ts
 *
 * Compile-time type tests using @ts-expect-error.
 * Run: npx tsc --noEmit
 * All lines marked @ts-expect-error MUST produce a TS error —
 * if they don't, tsc itself fails (double safety).
 */
import { createApiClient } from "./api-client.js";
const client = createApiClient();
// ════════════════════════════════════════════════════════════════════
// 1. Path must be a known route
// ════════════════════════════════════════════════════════════════════
// ✅ valid paths
void client.request("/users", "GET", {});
void client.request("/users/:id", "GET", { params: { id: "1" } });
// ❌ unknown path
// @ts-expect-error "/unknown" is not in ApiSchema
void client.request("/unknown", "GET", {});
// ════════════════════════════════════════════════════════════════════
// 2. Method depends on path
// ════════════════════════════════════════════════════════════════════
// ✅ valid methods
void client.request("/users", "GET", {});
void client.request("/users", "POST", { body: { name: "Ann", email: "a@b.com" } });
// ❌ DELETE is not defined for /users
// @ts-expect-error DELETE is not a method on /users
void client.request("/users", "DELETE", {});
// ❌ PUT is not defined anywhere in schema
// @ts-expect-error PUT is not a method on /users
void client.request("/users", "PUT", {});
// ════════════════════════════════════════════════════════════════════
// 3. params are required when present in schema
// ════════════════════════════════════════════════════════════════════
// ✅ correct params
void client.request("/users/:id", "GET", { params: { id: "123" } });
// ❌ missing params entirely
// @ts-expect-error params.id is required for /users/:id GET
void client.request("/users/:id", "GET", {});
// ❌ wrong param name
// @ts-expect-error userId is not a valid param key (should be id)
void client.request("/users/:id", "GET", { params: { userId: "123" } });
// ════════════════════════════════════════════════════════════════════
// 4. body is required where defined, forbidden where not
// ════════════════════════════════════════════════════════════════════
// ✅ correct body
void client.request("/users", "POST", {
    body: { name: "John", email: "john@example.com" },
});
// ❌ missing body for POST /users
// @ts-expect-error body with name+email is required for POST /users
void client.request("/users", "POST", {});
// ❌ body not allowed for GET /users (excess property)
// @ts-expect-error body is not part of GET /users config
void client.request("/users", "GET", { body: { name: "John" } });
// ════════════════════════════════════════════════════════════════════
// 5. query allowed only where defined
// ════════════════════════════════════════════════════════════════════
// ✅ query allowed for GET /users
void client.request("/users", "GET", { query: { page: 1 } });
// ❌ query not defined for GET /users/:id
// @ts-expect-error query is not defined for /users/:id GET
void client.request("/users/:id", "GET", { params: { id: "1" }, query: { page: 1 } });
// ════════════════════════════════════════════════════════════════════
// 6. Response type is correctly inferred
// ════════════════════════════════════════════════════════════════════
async function checkReturnTypes() {
    const users = await client.request("/users", "GET", {});
    // users should be an array — accessing [0] is valid
    const first = users[0];
    // TypeScript knows first has id, name, email (or undefined with noUncheckedIndexedAccess)
    if (first !== undefined) {
        const _id = first.id;
        const _name = first.name;
        void _id;
        void _name;
    }
    const user = await client.request("/users/:id", "GET", { params: { id: "1" } });
    const _email = user.email;
    void _email;
    const deleted = await client.request("/users/:id", "DELETE", { params: { id: "1" } });
    const _ok = deleted.success;
    void _ok;
}
void checkReturnTypes();
const _p1 = { id: "1", postId: "2" };
void _p1;
// @ts-expect-error missing postId
const _p1bad = { id: "1" };
void _p1bad;
const _r1 = { id: 1, name: "Alice", email: "a@b.com" };
void _r1;
const _m1 = "GET";
void _m1;
// @ts-expect-error DELETE is not a method of /users
const _m1bad = "DELETE";
void _m1bad;
const _pp1 = "/users";
void _pp1;
// @ts-expect-error /users/:id does not support POST
const _pp1bad = "/users/:id";
void _pp1bad;
