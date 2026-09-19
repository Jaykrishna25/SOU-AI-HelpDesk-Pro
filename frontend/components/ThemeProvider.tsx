"use client";
import { createContext, useContext, useEffect, useState } from "react";

/* Theme.

   Light is the default. A university portal is used in daylight, on projectors
   in lecture halls, and printed from — and a staff member opening it for the
   first time should not be handed a dark interface they have to go and change.
   Dark stays available, and a choice once made is remembered.

   The order of precedence:
     1. What this user chose before, if anything.
     2. What their operating system asks for.
     3. Light.

   System preference is only consulted on a first visit. Someone who
   deliberately picked light on a machine set to dark meant it. */

type Theme = "dark" | "light";
const KEY = "sou_theme";

const Ctx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  setTheme: () => {},
});
export const useTheme = () => useContext(Ctx);

function initial(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at "light" to match what the inline script in layout.tsx wrote,
  // so the server and first client render agree; the stored preference is
  // applied immediately afterwards.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => { setTheme(initial()); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
    try { window.localStorage.setItem(KEY, theme); } catch { /* private mode */ }
  }, [theme]);

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme,
        toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
