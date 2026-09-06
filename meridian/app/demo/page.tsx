import type { Metadata } from "next";

import { DemoDashboard } from "@/components/demo/demo-dashboard";

export const metadata: Metadata = {
  title: "Demo dashboard",
  description:
    "The whole of Meridian running on example data — no account, nothing saved.",
};

export default function DemoPage() {
  return <DemoDashboard />;
}
