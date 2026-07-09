"use client";

// components/shared/ThemeProvider.tsx
// V5.4 — wraps next-themes. Manual toggle only (no "follow system"), matching the decision:
// defaultTheme="dark" preserves the app's original look for anyone who's never toggled it;
// enableSystem={false} means it never silently switches on its own. Persists to localStorage
// automatically; the class next-themes sets on <html> is what the .dark/.light CSS variable
// blocks in globals.css key off.

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["dark", "light"]}>
      {children}
    </NextThemesProvider>
  );
}
