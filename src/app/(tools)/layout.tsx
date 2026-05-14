
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { ToolMobileGuard } from "@/shared/ui/ToolMobileGuard";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ErrorBoundary>
        <ToolMobileGuard>
          <main>{children}</main>
        </ToolMobileGuard>
      </ErrorBoundary>
    </>
  );
}
