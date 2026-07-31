/**
 * Resilient API fetch wrapper.
 *
 * The MarketMind AI dev server occasionally restarts (sandbox supervisor).
 * When it's down, the Caddy gateway returns an HTML 502 page, and a naive
 * `await res.json()` throws "Unexpected token '<'". This wrapper detects
 * non-JSON responses and throws a friendly ApiError instead, plus supports
 * automatic retry for transient failures.
 */

export class ApiError extends Error {
  status: number;
  isServerDown: boolean;
  constructor(message: string, status = 0, isServerDown = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isServerDown = isServerDown;
  }
}

const RETRYABLE = (status: number) => status === 0 || status >= 500;

interface ApiFetchOptions extends RequestInit {
  /** Number of retry attempts for transient (5xx / network) failures. Default 2. */
  retries?: number;
  /** Delay between retries in ms. Default 1500. */
  retryDelay?: number;
  /** Parse JSON response. Default true. */
  json?: boolean;
}

export async function apiFetch<T = any>(
  url: string,
  opts: ApiFetchOptions = {}
): Promise<T> {
  const { retries = 2, retryDelay = 1500, json = true, ...init } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);

      // Detect HTML responses (gateway 502, dev server down, etc.)
      // `text/plain` and empty content-type are NOT treated as HTML —
      // some valid API errors return text/plain and we don't want to
      // spuriously retry them or mislabel them as server-down.
      const ct = res.headers.get("content-type") || "";
      const isHtml = ct.includes("text/html");

      if (!res.ok) {
        if (isHtml || RETRYABLE(res.status)) {
          // Transient — retry if attempts remain
          if (attempt < retries) {
            await sleep(retryDelay * (attempt + 1));
            continue;
          }
        }
        // Try to extract a JSON error message, fall back to status text
        let msg = res.statusText || `Request failed (${res.status})`;
        if (!isHtml) {
          try {
            const body = await res.json();
            msg = body?.error || body?.message || msg;
          } catch {
            /* ignore */
          }
        }
        throw new ApiError(msg, res.status, isHtml || res.status === 0);
      }

      if (!json) return undefined as unknown as T;

      if (isHtml) {
        // Got a 200 but HTML — server is likely compiling / starting
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1));
          continue;
        }
        throw new ApiError(
          "The server is starting up. Please retry in a moment.",
          res.status,
          true
        );
      }

      try {
        return (await res.json()) as T;
      } catch {
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1));
          continue;
        }
        throw new ApiError(
          "Received an invalid response from the server. Please retry.",
          res.status,
          true
        );
      }
    } catch (err) {
      // Network-level failure (server unreachable)
      if (err instanceof ApiError && !err.isServerDown) throw err;
      lastErr = err;
      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }
      throw new ApiError(
        "Cannot reach the server. It may be restarting — please retry in a few seconds.",
        0,
        true
      );
    }
  }
  throw lastErr instanceof ApiError
    ? lastErr
    : new ApiError("Request failed after retries.", 0, true);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Lightweight server-health check used by the status banner.
 * Returns 'up' | 'down' | 'degraded'.
 */
export async function checkServerHealth(): Promise<"up" | "down"> {
  try {
    const res = await fetch("/api/dashboard", { method: "GET" });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) return "up";
    return "down";
  } catch {
    return "down";
  }
}
