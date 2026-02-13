import { StaticImageData } from "next/image";

export interface ToolCardProps {
    title: string;
    toolFolderName?: string;
    icon: StaticImageData | string;
    metadata: string[];
}