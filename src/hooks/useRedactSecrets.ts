import { useState, useCallback } from "react";
import { useRedactWorker } from "@/hooks/useRedactWorker";
import { RedactRequest, RedactResponse, ContentType, MaskingStyle } from "@/types/redact";

export function useRedactSecrets(initial?: {
    content?: string;
    contentType?: ContentType;
    fileName?: string | null;
    maskingStyle?: MaskingStyle;
    keys?: string[];
    literalTexts?: string[];
    regexPatterns?: string[];
}) {
    // Input State
    const [content, setContent] = useState(initial?.content ?? "");
    const [contentType, setContentType] = useState<ContentType>(initial?.contentType ?? "text");
    const [fileName, setFileName] = useState<string | null>(initial?.fileName ?? null);

    // Configuration State
    const [maskingStyle, setMaskingStyle] = useState<MaskingStyle>(initial?.maskingStyle ?? "partial");
    const [keys, setKeys] = useState<string[]>(initial?.keys ?? []);
    const [literalTexts, setLiteralTexts] = useState<string[]>(initial?.literalTexts ?? []);
    const [regexPatterns, setRegexPatterns] = useState<string[]>(initial?.regexPatterns ?? []);

    // Output State
    const [response, setResponse] = useState<RedactResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInternalLoading, setIsInternalLoading] = useState(false);

    // Worker
    const { redact, isLoading: isWasmLoading, isReady, engineLabel } = useRedactWorker();

    const isLoading = isInternalLoading || isWasmLoading;

    // Actions
    const handleRedact = useCallback(async () => {
        if (!content.trim()) return;

        setIsInternalLoading(true);
        setError(null);

        const requestBody: RedactRequest = {
            content,
            contentType,
            customConfigurations: {
                style: maskingStyle,
                userHints: {
                    keys,
                    literalTexts,
                    regexPatterns,
                }
            },
        };

        try {
            const data = await redact(requestBody);
            setResponse(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Something went wrong during local processing.";
            setError(message);
            console.error(err);
        } finally {
            setIsInternalLoading(false);
        }
    }, [content, contentType, maskingStyle, keys, literalTexts, regexPatterns, redact]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === "string") {
                setContent(result);
            }
            // Reset input handled by caller or ref
        };

        reader.onerror = () => {
            setError("Failed to read file");
        };

        reader.readAsText(file);
    }, []);

    const clearAll = useCallback(() => {
        setContent("");
        setResponse(null);
        setError(null);
        setFileName(null);
        setKeys([]);
        setLiteralTexts([]);
        setRegexPatterns([]);
    }, []);

    return {
        // State
        content, setContent,
        contentType, setContentType,
        fileName, setFileName,
        maskingStyle, setMaskingStyle,
        keys, setKeys,
        literalTexts, setLiteralTexts,
        regexPatterns, setRegexPatterns,
        response, setResponse,
        error, setError,
        isLoading,
        isReady,
        engineLabel,

        // Actions
        handleRedact,
        handleFileUpload,
        clearAll
    };
}
