import React from 'react';
import FooterLink from './FooterLink';

const Footer: React.FC = () => {
    return (
        <footer className="py-8 px-6 md:px-20 lg:px-40">
            <div className="max-w-[700px] mx-auto text-center space-y-4">
                <div className="flex flex-wrap justify-center gap-12 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    <a href="https://github.com/nicorithm" className="flex items-center gap-2 hover:opacity-70 transition-opacity">GitHub</a>
                    <a href="mailto:hello@obn.tools" className="flex items-center gap-2 hover:opacity-70 transition-opacity">Contact</a>
                </div>
                <div>
                    <p className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                        Open Build Network 
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Designed for macOS Professionals</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
