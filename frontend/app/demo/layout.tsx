import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "demo",
  description:
    "Interactive vima demo showing frame-level CII labels, COLMAP zone attribution, confidence scores, and payout-weighted construction evidence.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "vima demo",
    description:
      "Inspect the frame ledger, spatial zones, and payout weighting behind the vima construction intelligence demo.",
    url: "/demo",
    images: [
      {
        url: "/vima-yozakura-loop-v2-poster.jpg",
        width: 1920,
        height: 1080,
        alt: "vima demo interface for construction evidence and spatial intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "vima demo",
    description:
      "Inspect the frame ledger, spatial zones, and payout weighting behind the vima construction intelligence demo.",
    images: ["/vima-yozakura-loop-v2-poster.jpg"],
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
