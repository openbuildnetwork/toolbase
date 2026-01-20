import React from 'react';
import FooterLink from './FooterLink';

const Footer: React.FC = () => {
    return (
        <footer className="mt-auto py-12 px-6 border-t border-black/5 bg-black/[0.02]">
            <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-8">
                <div className="flex flex-wrap justify-center gap-12 text-[#8e8e93] text-sm font-medium">
                    <FooterLink href="#" iconUrl="/assets/icons/github-gray.svg">GitHub</FooterLink>
                    <FooterLink href="#" iconUrl="/assets/icons/docs.svg">Documentation</FooterLink>
                    <FooterLink href="#" iconUrl="/assets/icons/shield.svg">Privacy</FooterLink>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[#8e8e93] text-[11px] font-bold tracking-[0.1em] uppercase">
                        Privacy-First Engineering • Local Execution • 100% Open Source
                    </p>
                    <p className="text-[#c7c7cc] text-[11px]">Designed for macOS Professionals</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
