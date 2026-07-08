import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CalCut — AI Calorie Tracker",
    template: "%s · CalCut",
  },
  description:
    "Snap your food. Track calories instantly. CalCut uses AI to estimate calories and macros so you can stay lean without manual logging.",
  keywords: [
    "calorie tracker",
    "AI calorie tracker",
    "macro tracker",
    "food scanner",
    "CalCut",
  ],
  openGraph: {
    title: "CalCut — AI Calorie Tracker",
    description:
      "Track calories with a photo. Stay consistent without manual logging.",
    type: "website",
    siteName: "CalCut",
  },
  twitter: {
    card: "summary_large_image",
    title: "CalCut — AI Calorie Tracker",
    description:
      "Track calories with a photo. Stay consistent without manual logging.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-dvh bg-surface font-sans text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
