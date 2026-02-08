
import React, { useState, useMemo } from 'react';
import { SHAPE_CATEGORIES_CONFIG, SHAPE_DEFINITIONS } from '../nodes/shapes';
import { Search, ChevronDown, ChevronRight, icons } from 'lucide-react';

// Local type for shape items to handle both standard shapes and dynamic icons
// We need to import ShapeDefinition but since it's a type only import, we can rely on existing import or add it
import type { ShapeDefinition } from '@/types/open-draw.types';

type ShapeLibraryItem =
    | (ShapeDefinition & { type: string; icon?: undefined; data?: undefined })
    | { type: 'lucide-icon'; label: string; icon: React.ElementType; data: { iconName: string } }
    | { type: 'react-icon'; label: string; icon: React.ElementType; data: { iconName: string; iconType: 'react-icon' } };

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
            // When no search term, return original categories
            const staticCats = SHAPE_CATEGORIES_CONFIG.map(cat => ({
                ...cat,
                id: cat.name.toLowerCase(),
                shapes: cat.shapes.map(shapeType => {
                    const def = SHAPE_DEFINITIONS[shapeType];
                    return def ? { ...def, type: shapeType } : null;
                }).filter((s): s is NonNullable<typeof s> => !!s)
            }));

            return staticCats;
        }

        const lowerTerm = searchTerm.toLowerCase();

        // 1. Search existing static options
        const staticResults = SHAPE_CATEGORIES_CONFIG.map(category => ({
            ...category,
            id: category.name.toLowerCase(),
            shapes: category.shapes.map(shapeType => {
                const def = SHAPE_DEFINITIONS[shapeType];
                return def ? { ...def, type: shapeType } : null;
            }).filter((s): s is NonNullable<typeof s> => !!s)
                .filter(shape =>
                    shape.label.toLowerCase().includes(lowerTerm)
                ) as ShapeLibraryItem[]
        })).filter(category => category.shapes.length > 0);

        // 3. Search entire Lucide library dynamically
        const matchingIcons = Object.keys(icons).filter(iconName =>
            iconName.toLowerCase().includes(lowerTerm)
        ).map(iconName => {
            const IconComponent = icons[iconName as keyof typeof icons];
            return {
                type: 'lucide-icon' as const,
                label: iconName.replace(/([A-Z])/g, ' $1').trim(),
                icon: IconComponent,
                data: { iconName }
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
                // @ts-ignore
                finalResults[iconsCategoryIndex].shapes.push(...newIcons);
            } else {
                // Create new Icons category with results
                finalResults.push({
                    id: 'icons',
                    name: 'Icons (Search Results)',
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
                            {(!!searchTerm || expandedCategories.includes(category.name)) ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                            {category.name}
                        </button>

                        {(!!searchTerm || expandedCategories.includes(category.name)) && (
                            <div className="grid grid-cols-4 gap-2 px-2 py-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {category.shapes.map((shape: any) => {
                                    // Handle both Lucide icons and standard SVG shapes
                                    const isIcon = shape.type === 'lucide-icon' || shape.type === 'react-icon';
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
                                                        e.dataTransfer.setData('application/open-draw-data', JSON.stringify({
                                                            iconName: shape.data.iconName,
                                                            iconType: shape.data.iconType
                                                        }));
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

        </div>
    );
}
