export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};
export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;
export type AuthTokenGetter = () => Promise<string | null> | string | null;
const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";
let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;
export function setBaseUrl(url: string | null): void { _baseUrl = url ? url.replace(/\/+$/, "") : null; }
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void { _authTokenGetter = getter; }
function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const value = resolveUrl(input);
  if (/^https?:\/\//i.test(value)) return input;
  const next = `${_baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
  if (typeof input === "string") return next;
  if (input instanceof URL) return next;
  const request = input;
  const method = request.method.toUpperCase();
  return new Request(next, {
    method,
    headers: request.headers,
    body: method === "GET" || method === "HEAD" ? undefined : request.body,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    mode: request.mode,
    keepalive: request.keepalive,
    signal: request.signal,
  });
}
function methodOf(input: RequestInfo | URL, override?: string): string {
  if (override) return override.toUpperCase();
  return typeof Request !== "undefined" && input instanceof Request ? input.method.toUpperCase() : "GET";
}
function mergeHeaders(base?: HeadersInit, extra?: HeadersInit): Headers {
  const headers = new Headers(base);
  new Headers(extra).forEach((value, key) => headers.set(key, value));
  return headers;
}
export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  constructor(
    public readonly response: Response,
    public readonly data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(`HTTP ${response.status} ${response.statusText}`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status; this.statusText = response.statusText;
    this.headers = response.headers; this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
  readonly status: number; readonly statusText: string; readonly headers: Headers; readonly method: string; readonly url: string;
}
async function parseResponse(response: Response, responseType: CustomFetchOptions["responseType"]): Promise<unknown> {
  if (NO_BODY_STATUS.has(response.status)) return undefined;
  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();
  const contentType = response.headers.get("content-type") || "";
  if (responseType === "json" || contentType.includes("json")) {
    const text = await response.text(); return text ? JSON.parse(text) : undefined;
  }
  return response.text();
}
export async function customFetch<T = unknown>(input: RequestInfo | URL, options: CustomFetchOptions = {}): Promise<T> {
  const resolved = applyBaseUrl(input);
  const { responseType = "auto", headers: headerInit, ...init } = options;
  const method = methodOf(resolved, init.method);
  const url = resolveUrl(resolved);
  const headers = mergeHeaders({ Accept: DEFAULT_JSON_ACCEPT }, headerInit);
  if (init.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (_authTokenGetter && !headers.has("Authorization")) {
    const token = await _authTokenGetter(); if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(resolved, { ...init, method, headers });
  const data = await parseResponse(response, responseType);
  if (!response.ok) throw new ApiError(response, data as T | null, { method, url });
  return data as T;
}
