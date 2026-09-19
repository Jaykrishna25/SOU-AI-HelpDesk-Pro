import "./globals.css";
import type { Metadata } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";

/* Two typefaces, and the pairing is the point.

   The university's own wordmark is set in a serif. A portal that uses a
   geometric sans for everything reads as a startup product that happens to be
   at a university; one that carries a serif in its headings reads as the
   university's own. That is most of the difference between "looks like a
   SaaS" and "looks institutional", and it costs nothing.

   The serif is used for display only - page and panel headings. Body copy,
   tables and controls stay in the sans, because a serif at 13px in a dense
   table is harder to read, and this portal is mostly dense tables. */

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOU AI HelpDesk — Silver Oak University",
  description:
    "The Silver Oak University help desk: fees, results, attendance, bookings, "
    + "grievances and accreditation evidence, with an assistant that cites its sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head>
        {/* Applies the saved theme before first paint. Without this the page
            renders light, then flips to dark a frame later for anyone who
            chose dark — the flash is brief and looks broken. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sou_theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
if(t==='light'){document.documentElement.classList.add('light');}
document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
