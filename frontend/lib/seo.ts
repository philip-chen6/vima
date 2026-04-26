export const siteConfig = {
  name: "vima",
  title: "vima | video intelligence for construction sites",
  description:
    "Video intelligence for construction sites. Hardhat video becomes CII work labels, COLMAP zone attribution, and auditable SPL payout logic. No lidar.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vima.vercel.app",
  ogImage: "/og-image.png",
  repository: "https://github.com/philip-chen6/vinna",
  devpost: "https://hacktech-by-caltech-2026.devpost.com/",
  keywords: [
    "vima",
    "construction safety intelligence",
    "construction computer vision",
    "hardhat video analytics",
    "CII classification",
    "COLMAP zone attribution",
    "spatial intelligence",
    "Solana SPL payouts",
    "HackTech 2026",
    "Ironsite Prize",
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
