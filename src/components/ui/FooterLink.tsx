import React from 'react';

interface FooterLinkProps {
    href: string;
    iconUrl: string;
    children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ href, iconUrl, children }) => {
    return (
        <a className="flex items-center gap-2" href={href}>
            <img className='w-6 h-6' src={iconUrl} alt="" />
            {children}
        </a>
    );
};

export default FooterLink;
