import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VINNA — Construction Intelligence Index",
  description: "Field ops console for construction site safety monitoring. CII frame classifier + Solana raffle payout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-stone-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
