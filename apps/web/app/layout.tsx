import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";
const heading = localFont({
  src: "./fonts/GeneralSans-Variable.woff2",
  variable: "--font-heading",
  weight: "200 700",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const body = localFont({
  src: "./fonts/Switzer-Variable.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
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
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
