import { ToolHomeButton } from "@/components/ui/ToolHomeButton";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ToolHomeButton />
      {children}
    </>
  );
}
