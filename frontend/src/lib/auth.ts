import Cookies from "js-cookie";

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set("access_token", accessToken, { secure: true, sameSite: "strict", expires: 1 });
  Cookies.set("refresh_token", refreshToken, { secure: true, sameSite: "strict", expires: 7 });
}

export function clearTokens() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
  Cookies.remove("user_role");
}

export function getRole(): string | undefined {
  return Cookies.get("user_role");
}

export function setRole(role: string) {
  Cookies.set("user_role", role, { secure: true, sameSite: "strict" });
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
