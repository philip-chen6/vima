import { Metadata } from "next";
import ReviewClient from "./review-client";

export const metadata: Metadata = {
  title: "review · vima",
  description:
    "vima review queue — inspect generated construction claims, verify evidence, and build an auditable ledger.",
};

export default function ReviewPage() {
  return <ReviewClient />;
}
