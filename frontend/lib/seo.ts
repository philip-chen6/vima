export const siteConfig = {
  name: "vima",
  title: "VIMA — Verifiable Spatial Intelligence for Multimodal Annotation",
  description:
    "Construction rewards you can't fake: spatial memory + blockchain proof on every worker window. 62,783 gaussians. 66.7% wrench time. HackTech 2026 Ironsite Prize.",
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
