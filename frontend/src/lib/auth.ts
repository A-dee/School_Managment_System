import Cookies from "js-cookie";

function isSecureContext(): boolean {
  if (typeof window === "undefined") return true;
  return window.location.protocol === "https:";
}

function cookieOptions(days?: number) {
  // Keep one cookie policy across login, refresh, and logout so prod/dev behave consistently.
  return {
    path: "/",
    secure: isSecureContext(),
    sameSite: "lax" as const,
    ...(typeof days === "number" ? { expires: days } : {}),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set("sms_access_token", accessToken, cookieOptions(1));
  Cookies.set("sms_refresh_token", refreshToken, cookieOptions(7));
}

export function clearTokens() {
  const opts = cookieOptions();
  Cookies.remove("sms_access_token", opts);
  Cookies.remove("sms_refresh_token", opts);
  Cookies.remove("sms_user_role", opts);
}

export function getRole(): string | undefined {
  return Cookies.get("sms_user_role");
}

export function getSubscriptionTier(): string {
  return Cookies.get("sms_subscription_tier") || "Free";
}

export function setSubscriptionTier(tier: string) {
  Cookies.set("sms_subscription_tier", tier, cookieOptions(7));
}

export function getAccessToken(): string | undefined {
  return Cookies.get("sms_access_token");
}

export function getRefreshToken(): string | undefined {
  return Cookies.get("sms_refresh_token");
}

export function hasSession(): boolean {
  return Boolean(getRole() && (getAccessToken() || getRefreshToken()));
}

export function setRole(role: string) {
  Cookies.set("sms_user_role", role, cookieOptions(7));
}

export function storeAccessToken(accessToken: string) {
  Cookies.set("sms_access_token", accessToken, cookieOptions(1));
}

export function storeSession(accessToken: string, refreshToken: string, role: string) {
  setTokens(accessToken, refreshToken);
  setRole(role);
}

export function getDashboardPath(role: string): string {
  const paths: Record<string, string> = {
    SUPER_ADMIN: "/principal/dashboard",
    PRINCIPAL: "/principal/dashboard",
    ADMIN: "/admin/dashboard",
    TEACHER: "/teacher/dashboard",
    PARENT: "/parent/dashboard",
    STUDENT: "/student/dashboard",
    NON_TEACHING_STAFF: "/teacher/dashboard",
    SUPREME_ADMIN: "/admin/reset-superadmin",
    FINANCE: "/principal/finance",
  };
  return paths[role] || "/login";
}
