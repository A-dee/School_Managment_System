const IS_DEV = process.env.NODE_ENV === "development";

const COLORS = {
  req:  "color:#60a5fa;font-weight:700",   // blue
  ok:   "color:#4ade80;font-weight:700",   // green
  warn: "color:#fbbf24;font-weight:700",   // amber
  err:  "color:#f87171;font-weight:700",   // red
  info: "color:#a78bfa;font-weight:700",   // purple
  dim:  "color:#94a3b8",
};

export const logger = {
  /** Log an outgoing API request (dev only) */
  request(method: string, url: string) {
    if (!IS_DEV) return;
    console.groupCollapsed(`%c→ ${method.toUpperCase()}%c ${url}`, COLORS.req, COLORS.dim);
    console.log("url:", url);
    console.groupEnd();
  },

  /** Log a successful API response (dev only) */
  response(method: string, url: string, status: number, ms: number, data?: unknown) {
    if (!IS_DEV) return;
    const color = status < 300 ? COLORS.ok : COLORS.warn;
    console.groupCollapsed(`%c← ${status}%c ${method.toUpperCase()} ${url} %c(${ms}ms)`, color, COLORS.dim, COLORS.dim);
    if (data !== undefined) console.log("data:", data);
    console.groupEnd();
  },

  /** Log an API error — always logs in dev; in prod logs a minimal line */
  error(method: string, url: string, status: number | string, error: unknown) {
    if (IS_DEV) {
      console.group(`%c✗ ${status}%c ${method.toUpperCase()} ${url}`, COLORS.err, COLORS.dim);
      console.error(error);
      console.groupEnd();
    } else {
      console.error(`[API Error] ${status} ${method.toUpperCase()} ${url}`);
    }
  },

  /** Auth-specific events */
  auth(event: "token_refresh" | "redirect_login" | "logout" | "refresh_failed", detail?: string) {
    if (!IS_DEV) return;
    const msg = { token_refresh: "🔄 Token refreshed", redirect_login: "🔒 Redirecting to login", logout: "👋 Logged out", refresh_failed: "❌ Token refresh failed" }[event];
    console.log(`%c[Auth] ${msg}${detail ? ` — ${detail}` : ""}`, COLORS.info);
  },

  info(...args: unknown[])  { if (IS_DEV) console.info("%c[SMS]", COLORS.info, ...args); },
  warn(...args: unknown[])  { if (IS_DEV) console.warn("%c[SMS]", COLORS.warn, ...args); },
  debug(...args: unknown[]) { if (IS_DEV) console.debug("%c[SMS]", COLORS.dim,  ...args); },
};
