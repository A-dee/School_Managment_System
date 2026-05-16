import Cookies from "js-cookie";

function isSecureContext(): boolean {
  if (typeof window === "undefined") return true;
  return window.location.protocol === "https:";
}

function cookieOptions(days?: number) {
  // Keep one cookie policy across login, refresh, and logout so prod/dev behave consistently.
  return {
    secure: isSecureContext(),
    sameSite: "lax" as const,
    ...(typeof days === "number" ? { expires: days } : {}),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set("access_token", accessToken, cookieOptions(1));
  Cookies.set("refresh_token", refreshToken, cookieOptions(7));
}

export function clearTokens() {
  const opts = cookieOptions();
  Cookies.remove("access_token", opts);
  Cookies.remove("refresh_token", opts);
  Cookies.remove("user_role", opts);
}

export function getRole(): string | undefined {
  return Cookies.get("user_role");
}

export function setRole(role: string) {
  Cookies.set("user_role", role, cookieOptions(7));
}

export function storeAccessToken(accessToken: string) {
  Cookies.set("access_token", accessToken, cookieOptions(1));
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
  };
  return paths[role] || "/login";
}
