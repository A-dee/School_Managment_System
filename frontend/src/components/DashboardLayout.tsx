"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ErrorBoundary from "./ErrorBoundary";
import FirstLoginTutorial from "./FirstLoginTutorial";
import { getMe } from "@/lib/api";
import { clearTokens, hasSession, setRole } from "@/lib/auth";
import { DashboardShellProvider, useDashboardShell } from "@/contexts/DashboardShellContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const insideManagedShell = useDashboardShell();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  if (insideManagedShell) {
    return <>{children}</>;
  }

  useEffect(() => {
    let active = true;

    async function verifySession() {
      if (!hasSession()) {
        clearTokens();
        router.replace("/login");
        return;
      }

      try {
        const res = await getMe();
        const me = res?.data?.data;
        const currentRole = me?.role;
        if (currentRole) setRole(currentRole);
        if (active) {
          setCurrentUser(me || null);
          setAuthReady(true);
        }
      } catch {
        clearTokens();
        if (active) router.replace("/login");
      }
    }

    verifySession();
    return () => { active = false; };
  }, [router]);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center theme-root" style={{ background: "var(--bg-page)" }}>
        <div style={{ color: "var(--text-muted)", fontWeight: 700 }}>Checking your session...</div>
      </div>
    );
  }

  return (
    <DashboardShellProvider value={true}>
      <div className="dashboard-shell flex h-screen overflow-hidden theme-root">
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar onMenuClick={() => setSidebarOpen(v => !v)} />
          <main className="dashboard-main flex-1 overflow-y-auto" style={{ background: "var(--bg-page)" }}>
            <div className="main-content animate-fade-in">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
          <FirstLoginTutorial user={currentUser} />
        </div>
      </div>
    </DashboardShellProvider>
  );
}
