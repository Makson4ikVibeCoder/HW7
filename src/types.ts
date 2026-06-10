// ─── HTTP Methods ────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

// ─── Endpoint definition shape ───────────────────────────────────────────────

export type EndpointDef = {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  response: unknown;
};

export type PathDef = {
  [M in HttpMethod]?: EndpointDef;
};

export type ApiSchema = {
  [Path in string]: PathDef;
};

// ─── Utility: Extract named route params from path string ────────────────────
// e.g. "/users/:id/posts/:postId"  →  { id: string; postId: string }

export type ExtractRouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<`/${Rest}`>]: string }
    : Path extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : Record<never, never>;

// ─── Helper: is a type a non-empty object (has required keys) ─────────────────

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;

// ─── RequestConfig: builds the config shape for a given endpoint ─────────────

type ParamsPart<E extends EndpointDef> =
  E extends { params: infer P }
    ? HasRequiredKeys<P> extends true
      ? { params: P }
      : { params?: P }
    : { params?: never };

type QueryPart<E extends EndpointDef> =
  E extends { query: infer Q }
    ? HasRequiredKeys<Q> extends true
      ? { query: Q }
      : { query?: Q }
    : { query?: never };

type BodyPart<E extends EndpointDef> =
  E extends { body: infer B }
    ? HasRequiredKeys<B> extends true
      ? { body: B }
      : { body?: B }
    : { body?: never };

export type RequestConfig<E extends EndpointDef> =
  ParamsPart<E> & QueryPart<E> & BodyPart<E>;

// ─── ResponseOf: extract response type from schema ───────────────────────────

export type ResponseOf<
  TSchema extends ApiSchema,
  TPath extends keyof TSchema,
  TMethod extends keyof TSchema[TPath]
> = TSchema[TPath][TMethod] extends EndpointDef
  ? TSchema[TPath][TMethod]["response"]
  : never;

// ─── MethodsOf: get allowed HTTP methods for a path ──────────────────────────

export type MethodsOf<
  TSchema extends ApiSchema,
  TPath extends keyof TSchema
> = keyof TSchema[TPath] & HttpMethod;

// ─── PathsWithMethod: get all paths that support a given method ───────────────

export type PathsWithMethod<
  TSchema extends ApiSchema,
  TMethod extends HttpMethod
> = {
  [P in keyof TSchema]: TMethod extends keyof TSchema[P] ? P : never;
}[keyof TSchema];

// ─── Middleware types ─────────────────────────────────────────────────────────

export type MiddlewareContext = {
  path: string;
  method: HttpMethod;
  config: Record<string, unknown>;
};

export type BeforeMiddleware = (ctx: MiddlewareContext) => MiddlewareContext | Promise<MiddlewareContext>;
export type AfterMiddleware<T = unknown> = (ctx: MiddlewareContext, response: T) => T | Promise<T>;
export type ErrorMiddleware = (ctx: MiddlewareContext, error: unknown) => void | Promise<void>;

export type Middleware = {
  before?: BeforeMiddleware;
  after?: AfterMiddleware;
  onError?: ErrorMiddleware;
};
