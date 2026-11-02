import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";
import { appearanceScript } from "@/components/appearance";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const overusedGrotesk = localFont({
  src: "./fonts/OverusedGrotesk-VF.woff2",
  variable: "--font-overused-grotesk",
  weight: "300 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["monospace"],
});
export const metadata: Metadata = {
  title: {
    default: "Screenly · Technical interview practice",
    template: "%s · Screenly",
  },
  description:
    "Practice technical interviews with adaptive questions and feedback grounded in your answers.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${overusedGrotesk.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
