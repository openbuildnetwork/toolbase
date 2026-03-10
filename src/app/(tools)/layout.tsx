import { ToolHomeButton } from "@/components/ui/ToolHomeButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ToolHomeButton />
      <ErrorBoundary>
        <main>{children}</main>
      </ErrorBoundary>
    </>
  );
}
