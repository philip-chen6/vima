export const siteConfig = {
  name: "vima",
  title: "v i m a. — verifiable spatial intelligence for construction",
  description:
    "Construction rewards you can't fake: spatial memory + on-chain proof on every worker window. 30 frames, 86.7% wrench time, 0.939 mean confidence. HackTech 2026 Ironsite Prize.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vimaspatial.tech",
  ogImage: "/og-image.png",
  repository: "https://github.com/philip-chen6/vima",
  devpost: "https://devpost.com/software/vima",
  keywords: [
    "vima",
    "verifiable spatial intelligence",
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
