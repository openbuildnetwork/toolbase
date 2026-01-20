import { ToolCardProps } from '@/interface/toolSearch.interface';
import Link from 'next/link';
import React from 'react';

const ToolCard: React.FC<ToolCardProps> = ({ title, toolFolderName, icon, gradientFrom, gradientTo }) => {
    return (
        <Link href={`/tools/${toolFolderName}`} className="tool-card flex flex-col items-center gap-4 cursor-pointer group">
            <div
                className="icon-container w-[100px] h-[100px]"
                style={{ background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})` }}
            >
                <div className="icon-texture"></div>
                <div className="premium-sheen"></div>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <img className='w-12 h-12' src="/assets/icons/pdf.svg" alt="" />
                </div>
            </div>
            <p className="text-[14px] font-semibold text-center text-[#3a3a3c] group-hover:text-black transition-colors">
                {title}
            </p>
        </Link>
    );
};

export default ToolCard;
