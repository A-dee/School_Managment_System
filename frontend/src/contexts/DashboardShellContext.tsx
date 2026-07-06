import { createContext, useContext } from "react";

const DashboardShellContext = createContext(false);

export function DashboardShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: boolean;
}) {
  return (
    <DashboardShellContext.Provider value={value}>
      {children}
    </DashboardShellContext.Provider>
  );
}

export function useDashboardShell(): boolean {
  return useContext(DashboardShellContext);
}
