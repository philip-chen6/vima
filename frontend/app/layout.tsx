import type { Metadata, Viewport } from "next";
import { siteConfig, absoluteUrl } from "@/lib/seo";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: "%s | vima",
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [
    { name: "joshua", url: "https://github.com/qtzx06" },
    { name: "philip", url: "https://github.com/philip-chen6" },
    { name: "lucas", url: "https://github.com/lucas-309" },
    { name: "stephen", url: "https://github.com/stephenhungg" },
  ],
  creator: "vima",
  publisher: "vima",
  category: "construction technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "vima construction intelligence interface over a nocturnal construction scene",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
  other: {
    "github:repository": siteConfig.repository,
    "hackathon:devpost": siteConfig.devpost,
    "product:tagline": "Video intelligence for construction sites. No lidar.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#080503",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#0a0a0a] text-stone-100 overflow-x-hidden"
      >
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: siteConfig.name,
              url: absoluteUrl("/"),
              logo: absoluteUrl("/icon.svg"),
              sameAs: [siteConfig.repository, siteConfig.devpost],
            }),
          }}
        />
        <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
