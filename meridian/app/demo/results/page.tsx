import type { Metadata } from "next";

import { DemoResults } from "@/components/demo/demo-results";

export const metadata: Metadata = { title: "Demo results" };

export default function DemoResultsPage() {
  return <DemoResults />;
}
