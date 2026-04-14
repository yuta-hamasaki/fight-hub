import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fight Hub",
  description: "Bilingual-ready trainer marketplace skeleton.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
