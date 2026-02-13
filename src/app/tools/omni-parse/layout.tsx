import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OmniParse | Structural Data Engine",
  description: "OmniParse converts, validates, and generates structured data formats entirely in the browser.",
  keywords: ["data converter", "json xml yaml toml csv", "schema validation", "data generator"],
};

export default function OmniParseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
