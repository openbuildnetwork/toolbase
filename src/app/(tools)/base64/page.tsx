'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBase64 } from '@/hooks/useBase64Worker';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
import Editor from '@monaco-editor/react';
import {
    FileText,
    FileCode,
    Loader2,
    AlertCircle,
    Download,
    ArrowRight,
    Settings,
    ChevronDown,
    Sparkles,
    Eye,
    Upload,
    Copy,
    Check,
    Type,
    Binary,
    Image as ImageIcon,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import type { Base64Mode } from '@/types/base64';
import { motion, AnimatePresence } from 'framer-motion';

import { Base64Workspace } from '@/components/features/base64/Base64Workspace';

export default function Base64Page() {
    return (
        <div className="min-h-screen bg-(--background) py-6 px-4">
            <div className="max-w-[1800px] mx-auto flex flex-col h-[calc(100vh-48px)]">
                <header className="mb-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Binary className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Base64 Converter</h1>
                            <p className="text-sm text-gray-500 font-medium">Encode or decode text and files instantly</p>
                        </div>
                    </div>
                    <ReturnToToolsButton />
                </header>

                <div className="flex-1 min-h-0">
                    <Base64Workspace />
                </div>
            </div>
        </div>
    );
}
