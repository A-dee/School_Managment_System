"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "glass" | "nova" | "business";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("sms-theme") as Theme | null;
    if (stored) setThemeState(stored);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("sms-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} className="theme-root min-h-screen">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
