import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-white shadow-sm hover:brightness-110 active:scale-[0.98]",
            secondary: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-[0.98]",
            ghost: "bg-transparent text-gray-600 hover:bg-gray-100 active:scale-[0.98]",
            outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-[0.98]",
            danger: "bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-[0.98]",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 text-sm",
            lg: "h-12 px-6 text-base",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";
