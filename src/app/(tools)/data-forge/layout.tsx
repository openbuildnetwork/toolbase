import type { Metadata } from "next";
import { ToolPageTracker } from "@/components/ui/ToolPageTracker";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";

export const metadata: Metadata = {
  title: "Data Forge | OBN",
  description: "Generate structured mock data with constraints, entirely in the browser.",
  keywords: ["mock data", "data generator", "test data", "json", "xml"],
};

export default function DataForgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ToolPageTracker toolId="data-forge" />
      <PrivacyBadge toolId="data-forge" />
      {children}
    </>
  );
}
