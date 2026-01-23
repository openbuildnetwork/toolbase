import React, { useEffect, useState } from 'react';
import { Search, Command } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }, []);

    return (
        <div className='flex justify-center items-center w-full px-4'>
            <div className={cn(
                "relative sm:w-[500px] w-full group transition-all duration-500 ease-out",
                isFocused ? "scale-[1.02] -translate-y-1" : "scale-100 translate-y-0"
            )}>
                {/* Search Icon */}
                <div className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 z-10 transition-colors duration-300",
                    isFocused ? "text-primary/60" : "text-gray-400"
                )}>
                    <Search className="w-5 h-5" />
                </div>

                {/* Input Field */}
                <input
                    className={cn(
                        "w-full h-[56px] pl-14 pr-16 text-lg font-medium outline-none transition-all duration-300",
                        "bg-white/70 backdrop-blur-xl border border-black/5 rounded-2xl",
                        "placeholder:text-gray-400 text-gray-900 shadow-xs",
                        "focus:bg-white focus:border-primary/30 focus:ring-12 focus:ring-primary/10"
                    )}
                    placeholder="Search your favourite tools..."
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />

                {/* Shortcut Hint */}
                <div className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/50 border border-gray-200 transition-opacity duration-300 pointer-events-none",
                    isFocused ? "opacity-0" : "opacity-100 sm:flex hidden"
                )}>
                    {isMac ? (
                        <>
                            <Command className="w-3 h-3 text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-400 font-mono">K</span>
                        </>
                    ) : (
                        <>
                            <span className="text-[11px] font-bold text-gray-400 font-mono">Ctrl</span>
                            <span className="text-[11px] font-bold text-gray-400 font-mono">K</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchBar;
