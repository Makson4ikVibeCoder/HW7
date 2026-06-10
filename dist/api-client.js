// ─── URL helpers ──────────────────────────────────────────────────────────────
/**
 * Replaces :param segments in a route template with actual values.
 * buildUrl("/users/:id/posts/:postId", { id: "1", postId: "10" })
 * → "/users/1/posts/10"
 */
export function buildUrl(path, params = {}) {
    return path.replace(/:([^/]+)/g, (_, key) => {
        const value = params[key];
        if (value === undefined) {
            throw new Error(`Missing URL param: "${key}" for path "${path}"`);
        }
        return encodeURIComponent(value);
    });
}
/**
 * Serialises a plain object into a query string.
 * buildQuery({ page: 1, limit: 10, search: "hello" })
 * → "?page=1&limit=10&search=hello"
 */
export function buildQuery(query) {
    const pairs = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}
// ─── Runtime validation ───────────────────────────────────────────────────────
function validateConfig(path, method, config) {
    // Detect required :params from path
    const paramNames = [...path.matchAll(/:([^/]+)/g)].map((m) => m[1] ?? "");
    if (paramNames.length > 0) {
        const provided = (config["params"] ?? {});
        for (const name of paramNames) {
            if (!name || provided[name] === undefined) {
                throw new Error(`[runtime] Missing required param "${name}" for ${method} ${path}`);
            }
        }
    }
}
// ─── ApiClient ────────────────────────────────────────────────────────────────
export class ApiClient {
    constructor(options = {}) {
        this.middlewares = [];
        this.baseUrl = options.baseUrl ?? "";
    }
    /** Register a middleware (before / after / onError). */
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    /**
     * Type-safe request method.
     *
     * - `TPath`   is constrained to keys of TSchema
     * - `TMethod` is constrained to methods defined for TPath
     * - `config`  is derived automatically from the endpoint definition:
     *     • params  – required when the endpoint declares params
     *     • query   – allowed/required only when the endpoint declares query
     *     • body    – allowed/required only when the endpoint declares body
     * - Return type is inferred from `TSchema[TPath][TMethod]["response"]`
     */
    async request(path, method, config) {
        // Cast to a usable shape at runtime (types are already verified above)
        let ctx = {
            path,
            method: method,
            config: config,
        };
        // ── Runtime validation ──
        validateConfig(path, method, ctx.config);
        // ── Before middlewares ──
        for (const mw of this.middlewares) {
            if (mw.before)
                ctx = await mw.before(ctx);
        }
        // ── Build URL ──
        const params = (ctx.config["params"] ?? {});
        const query = (ctx.config["query"] ?? {});
        const body = ctx.config["body"];
        const url = this.baseUrl +
            buildUrl(ctx.path, params) +
            buildQuery(query);
        // ── Fetch ──
        let response;
        try {
            const res = await fetch(url, {
                method: ctx.method,
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
            }
            response = (await res.json());
            // ── After middlewares ──
            for (const mw of this.middlewares) {
                if (mw.after)
                    response = await mw.after(ctx, response);
            }
        }
        catch (err) {
            for (const mw of this.middlewares) {
                if (mw.onError)
                    await mw.onError(ctx, err);
            }
            throw err;
        }
        return response;
    }
}
// ─── Factory function ─────────────────────────────────────────────────────────
export function createApiClient(options = {}) {
    return new ApiClient(options);
}
