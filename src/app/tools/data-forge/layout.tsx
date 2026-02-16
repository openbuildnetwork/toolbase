import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mock Data Engine | OBN",
  description: "Generate structured mock data with constraints, entirely in the browser.",
  keywords: ["mock data", "data generator", "test data", "json", "xml"],
};

export default function DataForgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
