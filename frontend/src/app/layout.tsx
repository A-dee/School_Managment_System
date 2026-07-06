import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ConsentBanner from "@/components/ConsentBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hope Hills Academy — School Management",
  description: "School management portal for Hope Hills Academy, Mpape, Abuja. Crèche, Nursery & Primary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <Toaster position="top-right" />
          {children}
          <ConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
