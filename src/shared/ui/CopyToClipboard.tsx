import React, { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';

interface CopyToClipboardProps {
    text: string;
    className?: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

export const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
    text,
    className,
    variant = 'secondary',
    size = 'sm',
    showText = true,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    return (
        <Button
            onClick={handleCopy}
            variant={variant}
            size={size}
            className={cn(
                'transition-all duration-300',
                copied && 'bg-green-500 hover:bg-green-600 text-white',
                className
            )}
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4" />
                    {showText && <span>Copied!</span>}
                </>
            ) : (
                <>
                    <Copy className="h-4 w-4" />
                    {showText && <span>Copy</span>}
                </>
            )}
        </Button>
    );
};
