import {
    ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import clsx from "clsx";

/* =========================================================
   Types
========================================================= */

export type TabsOrientation = "horizontal" | "vertical";

export type TabsColors = {
    container?: string;
    indicator?: string;

    activeBackground?: string; // active tab bg
    activeBorder?: string;     // ✅ NEW: active tab border

    buttonHover?: string;
    label?: {
        active?: string;
        onHoverColor?: string;
        inactive?: string;
        disabled?: string;
    };
};

export type TabItem<T extends string> = {
    id: T;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
};

type TabsProps<T extends string> = {
    tabs: TabItem<T>[];
    value: T;
    onChange: (id: T) => void;

    orientation?: TabsOrientation;
    size?: "sm" | "md" | "lg";

    /** Preset or full Tailwind radius class */
    radius?: "md" | "lg" | "full" | string;

    colors?: TabsColors;
    className?: string;
};

/* =========================================================
   Motion
========================================================= */

const spring = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/* =========================================================
   Default Colors
========================================================= */

const defaultColors: Required<TabsColors> = {
    container:
        "bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/40 dark:border-zinc-800/40",
    indicator: "bg-white dark:bg-zinc-800",

    activeBackground:
        "bg-white/80 dark:bg-zinc-800/80",

    activeBorder:
        "border border-gray-300",

    buttonHover: "hover:none",

    label: {
        active: "text-zinc-900 dark:text-white",
        onHoverColor: "hover:text-black",
        inactive: "text-zinc-600 dark:text-zinc-400",
        disabled: "text-zinc-400 dark:text-zinc-600",
    },
};

/* =========================================================
   Tabs Component
========================================================= */

export function Tabs<T extends string>({
    tabs,
    value,
    onChange,
    orientation = "horizontal",
    size = "md",
    radius = "full",
    colors,
    className,
}: TabsProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>(
        {}
    );

    const [indicator, setIndicator] = useState({
        width: 0,
        height: 0,
        left: 0,
        top: 0,
    });

    const isVertical = orientation === "vertical";

    const theme = {
        ...defaultColors,
        ...colors,
        label: {
            ...defaultColors.label,
            ...colors?.label,
        },
    };

    /* ---------- Radius ---------- */

    const radiusClass =
        radius === "md"
            ? "rounded-md"
            : radius === "lg"
                ? "rounded-lg"
                : radius === "full"
                    ? "rounded-full"
                    : radius;

    /* ---------- Indicator positioning ---------- */

    const updateIndicator = useCallback(() => {
        const activeTab = tabRefs.current[value];
        const container = containerRef.current;
        if (!activeTab || !container) return;

        const a = activeTab.getBoundingClientRect();
        const c = container.getBoundingClientRect();

        setIndicator({
            width: a.width,
            height: a.height,
            left: a.left - c.left,
            top: a.top - c.top,
        });
    }, [value]);

    useLayoutEffect(updateIndicator, [updateIndicator]);
    useEffect(() => {
        window.addEventListener("resize", updateIndicator);
        return () =>
            window.removeEventListener("resize", updateIndicator);
    }, [updateIndicator]);

    /* ---------- Keyboard navigation ---------- */

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLButtonElement>,
        index: number
    ) => {
        const dir =
            e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;

        if (!dir) return;

        e.preventDefault();

        let next = index + dir;
        while (tabs[next] && tabs[next].disabled) {
            next += dir;
        }

        if (tabs[next]) {
            onChange(tabs[next].id);
        }
    };

    /* ---------- Styles ---------- */

    const sizeStyles = {
        sm: "h-8 text-xs",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
    };

    /* ========================================================= */

    return (
        <div
            ref={containerRef}
            role="tablist"
            aria-orientation={orientation}
            className={clsx(
                "relative inline-flex p-1 backdrop-blur-xl gap-3",
                isVertical ? "flex-col" : "",
                radiusClass,
                theme.container,
                className
            )}
        >
            {/* Sliding indicator (stick) */}
            <span
                className={clsx(
                    "absolute z-0 shadow-sm transition-all duration-300",
                    radiusClass,
                    theme.indicator
                )}
                style={{
                    width: isVertical ? "auto" : indicator.width,
                    height: isVertical ? indicator.height : "auto",
                    transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
                    transitionTimingFunction: spring,
                }}
            />

            {tabs.map((tab, index) => {
                const active = tab.id === value;

                return (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabRefs.current[tab.id] = el;
                        }}
                        role="tab"
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        disabled={tab.disabled}
                        onClick={() => onChange(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={clsx(
                            "relative z-10 flex items-center gap-2 px-4",
                            "focus:outline-none transition-all duration-200 hover:cursor-pointer",
                            theme.label.onHoverColor,
                            sizeStyles[size],
                            radiusClass,
                            !tab.disabled && theme.buttonHover,
                            tab.disabled && "cursor-not-allowed",

                            active && theme.activeBackground,
                            active && theme.activeBorder, // ✅ ACTIVE BORDER

                            active
                                ? theme.label.active
                                : theme.label.inactive,
                            tab.disabled && theme.label.disabled
                        )}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        <span className="whitespace-nowrap">
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
