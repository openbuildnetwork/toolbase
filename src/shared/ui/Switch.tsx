import React from "react";
import { cn } from "@/shared/lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, ...props }, ref) => {
        return (
            <label className="relative inline-flex items-center cursor-pointer haptic-click">
                <input type="checkbox" ref={ref} className="sr-only peer" {...props} />
                <div className={cn(
                    "w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all after:duration-300 after:shadow-md peer-checked:bg-[#34c759] transition-colors duration-300",
                    className
                )}></div>
            </label>
        );

    }
);
Switch.displayName = "Switch";
