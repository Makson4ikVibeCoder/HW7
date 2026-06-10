import type {
  ApiSchema,
  EndpointDef,
  HttpMethod,
  Middleware,
  MiddlewareContext,
  RequestConfig,
  ResponseOf,
  MethodsOf,
} from "./types.js";

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Replaces :param segments in a route template with actual values.
 * buildUrl("/users/:id/posts/:postId", { id: "1", postId: "10" })
 * → "/users/1/posts/10"
 */
export function buildUrl(
  path: string,
  params: Record<string, string> = {}
): string {
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
export function buildQuery(query: Record<string, unknown>): string {
  const pairs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

// ─── Runtime validation ───────────────────────────────────────────────────────

function validateConfig(
  path: string,
  method: string,
  config: Record<string, unknown>
): void {
  // Detect required :params from path
  const paramNames = [...path.matchAll(/:([^/]+)/g)].map((m) => m[1] ?? "");
  if (paramNames.length > 0) {
    const provided = (config["params"] ?? {}) as Record<string, unknown>;
    for (const name of paramNames) {
      if (!name || provided[name] === undefined) {
        throw new Error(
          `[runtime] Missing required param "${name}" for ${method} ${path}`
        );
      }
    }
  }
}

// ─── ApiClient ────────────────────────────────────────────────────────────────

export class ApiClient<TSchema extends ApiSchema> {
  private baseUrl: string;
  private middlewares: Middleware[] = [];

  constructor(options: { baseUrl?: string } = {}) {
    this.baseUrl = options.baseUrl ?? "";
  }

  /** Register a middleware (before / after / onError). */
  use(middleware: Middleware): this {
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
  async request<
    TPath extends keyof TSchema & string,
    TMethod extends MethodsOf<TSchema, TPath>,
  >(
    path: TPath,
    method: TMethod,
    config: TSchema[TPath][TMethod] extends EndpointDef
      ? RequestConfig<TSchema[TPath][TMethod]>
      : never
  ): Promise<ResponseOf<TSchema, TPath, TMethod>> {
    // Cast to a usable shape at runtime (types are already verified above)
    let ctx: MiddlewareContext = {
      path,
      method: method as HttpMethod,
      config: config as Record<string, unknown>,
    };

    // ── Runtime validation ──
    validateConfig(path, method as string, ctx.config);

    // ── Before middlewares ──
    for (const mw of this.middlewares) {
      if (mw.before) ctx = await mw.before(ctx);
    }

    // ── Build URL ──
    const params = (ctx.config["params"] ?? {}) as Record<string, string>;
    const query = (ctx.config["query"] ?? {}) as Record<string, unknown>;
    const body = ctx.config["body"] as Record<string, unknown> | undefined;

    const url =
      this.baseUrl +
      buildUrl(ctx.path, params) +
      buildQuery(query);

    // ── Fetch ──
    let response: unknown;
    try {
      const res = await fetch(url, {
        method: ctx.method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      }

      response = (await res.json()) as unknown;

      // ── After middlewares ──
      for (const mw of this.middlewares) {
        if (mw.after) response = await mw.after(ctx, response);
      }
    } catch (err) {
      for (const mw of this.middlewares) {
        if (mw.onError) await mw.onError(ctx, err);
      }
      throw err;
    }

    return response as ResponseOf<TSchema, TPath, TMethod>;
  }
}

// ─── Factory function ─────────────────────────────────────────────────────────

export function createApiClient<TSchema extends ApiSchema>(
  options: { baseUrl?: string } = {}
): ApiClient<TSchema> {
  return new ApiClient<TSchema>(options);
}
