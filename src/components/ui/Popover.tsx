
import * as React from "react"
import { cn } from "@/lib/utils"

export interface PopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
    trigger: React.ReactNode
    content: React.ReactNode
    align?: "left" | "right" | "center"
    side?: "top" | "bottom"
}

export function Popover({ trigger, content, align = "left", side = "bottom", className, ...props }: PopoverProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const popoverRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={cn("relative inline-block text-left", className)} ref={popoverRef} {...props}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>
            {isOpen && (
                <div
                    className={cn(
                        "absolute z-50 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200",
                        side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
                        align === "left" ? "left-0" : (align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"),
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    )
}
