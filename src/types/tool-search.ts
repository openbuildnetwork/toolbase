import { StaticImageData } from "next/image";

export interface ToolCardProps {
    title: string;
    toolFolderName?: string;
    icon: StaticImageData;
    gradientFrom: string;
    gradientTo: string;
}