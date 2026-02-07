import React, { useState, useMemo } from 'react';
import { SHAPE_CATEGORIES_CONFIG, SHAPE_DEFINITIONS } from '../nodes/shapes';
import { Search, ChevronDown, ChevronRight, icons } from 'lucide-react';

// Local type for shape items to handle both standard shapes and dynamic icons
// We need to import ShapeDefinition but since it's a type only import, we can rely on existing import or add it
import type { ShapeDefinition } from '@/types/open-draw.types';

type ShapeLibraryItem =
    | (ShapeDefinition & { type: string; icon?: undefined; data?: undefined })
    | { type: 'lucide-icon'; label: string; icon: React.ElementType; data: { iconName: string } };

interface ShapeLibraryProps {
    onDragStart: (event: React.DragEvent, shapeType: string) => void;
}

export function ShapeLibrary({ onDragStart }: ShapeLibraryProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic', 'flowchart', 'icons']);

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    // Filter shapes based on search
    const filteredCategories = useMemo(() => {
        if (!searchTerm) {
            // When no search term, return original categories, but ensure they have 'id' for consistency
            return SHAPE_CATEGORIES_CONFIG.map(cat => ({
                ...cat,
                id: cat.name.toLowerCase(), // Add id for consistency with new logic
                shapes: cat.shapes.map(shapeType => {
                    const def = SHAPE_DEFINITIONS[shapeType];
                    return def ? { ...def, type: shapeType } : null; // Convert shapeType to object
                }).filter((s): s is NonNullable<typeof s> => !!s)
            }));
        }

        const lowerTerm = searchTerm.toLowerCase();

        // 1. Search existing static options
        const staticResults = SHAPE_CATEGORIES_CONFIG.map(category => ({
            ...category,
            id: category.name.toLowerCase(), // Ensure id is present
            shapes: category.shapes.map(shapeType => {
                const def = SHAPE_DEFINITIONS[shapeType];
                return def ? { ...def, type: shapeType } : null; // Convert shapeType to object
            }).filter((s): s is NonNullable<typeof s> => !!s)
                .filter(shape =>
                    shape.label.toLowerCase().includes(lowerTerm)
                ) as ShapeLibraryItem[]
        })).filter(category => category.shapes.length > 0);

        // 2. Search entire Lucide library dynamically
        const matchingIcons = Object.keys(icons).filter(iconName =>
            iconName.toLowerCase().includes(lowerTerm)
        ).map(iconName => {
            const IconComponent = icons[iconName as keyof typeof icons];
            return {
                type: 'lucide-icon' as const, // Custom type for Lucide icons
                label: iconName.replace(/([A-Z])/g, ' $1').trim(), // Add spaces to CamelCase
                icon: IconComponent, // Store the component itself
                data: { iconName } // Store original icon name for identification
            };
        });

        // Merge results
        const finalResults = [...staticResults];

        if (matchingIcons.length > 0) {
            // Check if 'Icons' category exists in static results
            const iconsCategoryIndex = finalResults.findIndex(c => c.id === 'icons');

            if (iconsCategoryIndex >= 0) {
                // Add unique dynamic icons to existing Icons category
                const existingIconNames = new Set(finalResults[iconsCategoryIndex].shapes.map(s => s.data?.iconName));
                const newIcons = matchingIcons.filter(i => !existingIconNames.has(i.data.iconName));
                finalResults[iconsCategoryIndex].shapes.push(...newIcons);
            } else {
                // Create new Icons category with results
                finalResults.push({
                    id: 'icons',
                    name: 'Icons (Search Results)', // Use 'name' for display
                    shapes: matchingIcons
                });
            }
        }

        return finalResults;
    }, [searchTerm]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800 w-64 select-none">
            {/* Header / Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Shapes</h2>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search shapes..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100 dark:bg-[#252525] text-gray-900 dark:text-gray-100 border-transparent focus:bg-white dark:focus:bg-[#252525] focus:ring-2 focus:ring-blue-500 rounded-lg transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Shape List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                {filteredCategories.map(category => (
                    <div key={category.name} className="flex flex-col">
                        <button
                            onClick={() => toggleCategory(category.name)}
                            className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        >
                            {expandedCategories.includes(category.name) ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                            {category.name}
                        </button>

                        {expandedCategories.includes(category.name) && (
                            <div className="grid grid-cols-4 gap-2 px-2 py-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {category.shapes.map((shape: any) => {
                                    // Handle both Lucide icons and standard SVG shapes
                                    const isIcon = shape.type === 'lucide-icon';
                                    const IconComponent = shape.icon;

                                    return (
                                        <div
                                            key={isIcon && shape.data ? shape.data.iconName : shape.type}
                                            className="group relative aspect-square flex flex-col items-center justify-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252525] cursor-grab active:cursor-grabbing border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                            draggable
                                            onDragStart={(e) => {
                                                if (isIcon) {
                                                    // For icons, we need to pass the icon name in data
                                                    e.dataTransfer.setData('application/reactflow', 'icon');
                                                    if (shape.data) {
                                                        e.dataTransfer.setData('application/open-draw-data', JSON.stringify({ iconName: shape.data.iconName }));
                                                    }
                                                } else {
                                                    e.dataTransfer.setData('application/reactflow', shape.type);
                                                }
                                            }}
                                            title={shape.label}
                                        >
                                            <div className="w-8 h-8 opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                {isIcon && IconComponent ? (
                                                    <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                                                ) : (
                                                    <svg viewBox={(shape as ShapeDefinition).viewBox || "0 0 100 100"} className="w-full h-full text-gray-700 dark:text-gray-300">
                                                        {(shape as ShapeDefinition).path && (
                                                            <path d={(shape as ShapeDefinition).path} fill="none" stroke="currentColor" strokeWidth="2" />
                                                        )}
                                                        {(shape as ShapeDefinition).paths?.map((p, i) => (
                                                            <path key={i} d={p.d} fill="none" stroke="currentColor" strokeWidth="2" />
                                                        ))}
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Custom Import Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#252525]">
                <button
                    onClick={() => {
                        const input = prompt('Paste SVG string or XML Stencil definition:');
                        if (input) {
                            // Dispatch event or callback to handle import
                            // Ideally this should be a proper modal, but for now we use a custom event or callback prop
                            // Since we only have onDragStart, we need a way to add this to the library or canvas.
                            // Let's assume we add it to a "Custom" category dynamically or just log it for now.
                            // Actually, let's expose an onImport prop or handle it internally if we can update SHAPE_DEFINITIONS.
                            // But SHAPE_DEFINITIONS is a const. We need to make it mutable or use a state-based library.
                            // For this "Infinite" strategy, we should probably have a `useShapeLibrary` hook.
                            // For now, let's emit a custom window event that the parent can listen to, or simpler:
                            // We will add it to a temporary session-based storage or just alert not implemented fully yet
                            // Wait, the user wants me to DO this. 

                            // Real implementation:
                            // 1. Parse string
                            // 2. Add to a "Custom" category in state (we need to lift state up or use context)
                            // 3. For this refactor, I'll emit a custom event 'open-draw-import-shape'
                            const event = new CustomEvent('open-draw-import-shape', { detail: input });
                            window.dispatchEvent(event);
                        }
                    }}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <span className="text-lg leading-none">+</span> Import Custom Shape
                </button>
            </div>
        </div>
    );
}
