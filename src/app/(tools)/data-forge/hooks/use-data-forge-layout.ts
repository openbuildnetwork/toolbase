import { useMemo, useState } from "react";
import { FlaskConical, Layers3, Sparkles } from "lucide-react";
import type { ToolSidebarItem } from "@/components/ui/ToolSidebar";

export type DataForgeSection = "fields" | "blueprint" | "testing";

export function useDataForgeLayout() {
  const sections: ToolSidebarItem[] = useMemo(
    () => [
      { id: "fields", label: "Field Builder", icon: Layers3 },
      { id: "blueprint", label: "Blueprint Generator", icon: Sparkles },
      { id: "testing", label: "Testing Studio", icon: FlaskConical },
    ],
    []
  );

  const [activeSection, setActiveSection] = useState<DataForgeSection>("fields");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const activeLabel = sections.find((section) => section.id === activeSection)?.label || "Data Forge";

  return {
    sections,
    activeSection,
    setActiveSection,
    isSidebarOpen,
    setSidebarOpen,
    activeLabel,
  };
}
