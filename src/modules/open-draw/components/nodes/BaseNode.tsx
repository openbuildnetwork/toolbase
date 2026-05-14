import { Handle, Position } from '@xyflow/react';
import { ReactNode } from 'react';

type BaseNodeProps = {
    children: ReactNode;
    selected?: boolean;
    className?: string;
    contentClassName?: string;
};

export function BaseNode({ children, selected, className = '', contentClassName = '' }: BaseNodeProps) {
    // Common handle styles
    const handleBaseClasses = "w-3 h-3 bg-blue-500 border-2 border-white rounded-full z-[100] opacity-0 group-hover:opacity-100 transition-opacity duration-200 !absolute";

    return (
        <div className={`relative group ${className}`}>
            {/* Handles */}
            <Handle type="source" position={Position.Top} id="top" className={`${handleBaseClasses} -top-1.5 left-1/2 -translate-x-1/2`} />
            <Handle type="source" position={Position.Right} id="right" className={`${handleBaseClasses} -right-1.5 top-1/2 -translate-y-1/2`} />
            <Handle type="source" position={Position.Bottom} id="bottom" className={`${handleBaseClasses} -bottom-1.5 left-1/2 -translate-x-1/2`} />
            <Handle type="source" position={Position.Left} id="left" className={`${handleBaseClasses} -left-1.5 top-1/2 -translate-y-1/2`} />

            {/* Content */}
            <div className={`
        ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm hover:shadow-md'} 
        transition-all duration-200
        bg-white dark:bg-[#1a1a1a] dark:text-gray-100
        ${contentClassName}
      `}>
                {children}
            </div>
        </div>
    );
}
