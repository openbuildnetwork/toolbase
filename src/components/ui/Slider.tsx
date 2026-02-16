import React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueDisplay?: React.ReactNode;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, label, valueDisplay, ...props }, ref) => {
        return (
            <div className={cn("w-full", className)}>
                {(label || valueDisplay) && (
                    <div className="flex justify-between items-center mb-2">
                        {label && (
                            <label className="text-sm font-medium text-gray-700">
                                {label}
                            </label>
                        )}
                        {valueDisplay && (
                            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {valueDisplay}
                            </span>
                        )}
                    </div>
                )}
                <div className="relative flex items-center select-none touch-none w-full h-5">
                    <input
                        type="range"
                        ref={ref}
                        className={cn(
                            "w-full absolute h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary",
                            "focus:outline-none focus:ring-2 focus:ring-primary/20",
                            className
                        )}
                        {...props}
                    />
                </div>
            </div>
        );
    }
);

Slider.displayName = "Slider";
