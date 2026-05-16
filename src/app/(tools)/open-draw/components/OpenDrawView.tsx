"use client";

import { OpenDrawLayout } from '@/app/(tools)/open-draw/components/layouts/MainLayout';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";

export default function OpenDrawView() {
    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 right-4 z-50">
                <ReturnToToolsButton />
            </div>
            <OpenDrawLayout />
        </div>
    );
}
