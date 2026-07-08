import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ConsentBanner from "@/components/ConsentBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lenage Management Systems",
  description: "Enterprise school management and administration system by Lenage Technologies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
        <ThemeProvider>
          <Toaster position="top-right" />
          {children}
          <ConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
