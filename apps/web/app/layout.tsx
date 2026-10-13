import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";
const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});
const mono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
});
export const metadata: Metadata = {
  title: { default: "Forma — Find your next level", template: "%s · Forma" },
  description:
    "Thoughtful technical interview practice. A real conversation, adaptive questions, and clear feedback for your next step.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
