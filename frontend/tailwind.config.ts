import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /* ============================================================
         Silver Oak University palette, taken from the institutional
         logo: the maroon of the wordmark and the NAAC shield, the
         forest green of the oak, and the gold of the laurel.

         `brand.cyan` keeps its name because twenty-two files
         reference it. Renaming the key would mean touching all of
         them for no gain; the value is what matters, and it is now
         the logo's green.
         ============================================================ */
      colors: {
        brand: {
          DEFAULT: "#9B1C26",   // maroon - wordmark and shield
          light:   "#C4414B",   // lighter maroon, legible on dark
          dark:    "#6E1219",
          cyan:    "#106B3F",   // the oak's green (key kept for compatibility)
          green:   "#106B3F",
          leaf:    "#1C8A54",
          gold:    "#C9A227",   // laurel
          cream:   "#F7F1E8",
        },
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
