import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fight Hub",
  description:
    "Find your martial arts and fitness coach. 格闘技・フィットネスのトレーナー検索と予約。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1d4ed8",
          borderRadius: "0.75rem",
          fontFamily: "inherit",
        },
        elements: {
          formButtonPrimary: "min-h-12",
          formFieldInput: "min-h-12",
          card: "border border-slate-200 shadow-sm",
        },
      }}
    >
      <html lang="en">
        <body className="min-h-screen font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
