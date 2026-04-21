
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ErrorBoundary>
        <main>{children}</main>
      </ErrorBoundary>
    </>
  );
}
