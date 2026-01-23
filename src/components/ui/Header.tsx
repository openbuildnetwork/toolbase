import Link from 'next/link';
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-100 w-full bg-white/70 backdrop-blur-2xl border-b border-black/5 px-6 md:px-20 lg:px-40 py-4">
            <div className="max-w-[1200px] p-2 mx-auto flex items-center justify-between gap-4">
                <Link href="/">
                    <img className='h-6' src="/assets/images/logo-dark.png" alt="Logo" />
                </Link>
                <div className="flex items-center gap-3">
                    <img className='w-6 h-6 cursor-pointer' src="/assets/icons/settings.svg" alt="" />
                </div>
            </div>
        </header>
    );
};

export default Header;
