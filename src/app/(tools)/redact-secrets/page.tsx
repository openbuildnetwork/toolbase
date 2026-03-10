"use client";

import React from "react";
import {
    Shield,
    Trash2,
    AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

import { useRedactSecrets } from "@/hooks/useRedactSecrets";
import { RedactEditor } from "@/components/features/redact-secrets/RedactEditor";
import { RedactConfiguration } from "@/components/features/redact-secrets/RedactConfiguration";
import { RedactOutput } from "@/components/features/redact-secrets/RedactOutput";
import { RedactStats } from "@/components/features/redact-secrets/RedactStats";
import { EngineLoader } from "@/components/ui/EngineLoader";

export default function RedactSecretsPage() {
    const {
        content,
        setContent,
        contentType,
        setContentType,
        fileName,
        maskingStyle,
        setMaskingStyle,
        keys,
        setKeys,
        literalTexts,
        setLiteralTexts,
        regexPatterns,
        setRegexPatterns,
        response,
        error,
        isLoading,
        isReady,
        engineLabel,
        handleRedact,
        handleFileUpload,
        clearAll
    } = useRedactSecrets();

    return (
        <div className="min-h-screen bg-background-light p-4 md:p-8 font-display">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <Shield className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Secret Redactor</h1>
                                <p className="text-sm text-gray-500 font-medium">Protect sensitive information and PII automatically</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={clearAll} className="bg-white/50 backdrop-blur-md border-gray-200 h-11 px-6 rounded-xl hover:bg-white hover:border-gray-300 transition-all">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                        <Button
                            onClick={handleRedact}
                            isLoading={isLoading}
                            className="macos-primary-button min-w-[140px] h-11 px-8"
                        >
                            {isLoading ? "Redacting..." : "Redact Now"}
                        </Button>
                    </div>
                </header>

                <EngineLoader isReady={isReady} engine="wasm" />
                <div
                    className={cn(
                        "rounded-2xl border px-4 py-3",
                        engineLabel === "Rust WASM"
                            ? "border-sky-200 bg-sky-50/80"
                            : "border-amber-200 bg-amber-50/80"
                    )}
                >
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Runtime Engine</p>
                    <p
                        className={cn(
                            "mt-1 text-sm font-semibold",
                            engineLabel === "Rust WASM" ? "text-sky-700" : "text-amber-700"
                        )}
                    >
                        Engine: {engineLabel}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-display">
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-8 space-y-6">
                        <RedactEditor
                            content={content}
                            setContent={setContent}
                            contentType={contentType}
                            setContentType={setContentType}
                            fileName={fileName}
                            onFileUpload={handleFileUpload}
                        />

                        <RedactOutput response={response} />

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600"
                            >
                                <AlertCircle className="w-5 h-5 fill-red-100" />
                                <p className="text-sm font-semibold">{error}</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Settings & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        <RedactConfiguration
                            maskingStyle={maskingStyle}
                            setMaskingStyle={setMaskingStyle}
                            keys={keys}
                            setKeys={setKeys}
                            literalTexts={literalTexts}
                            setLiteralTexts={setLiteralTexts}
                            regexPatterns={regexPatterns}
                            setRegexPatterns={setRegexPatterns}
                        />

                        <RedactStats response={response} />
                    </div>
                </div>
            </div>
        </div>
    );
}
