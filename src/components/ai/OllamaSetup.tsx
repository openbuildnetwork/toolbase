import React from "react";
import { useOllama } from "@/hooks/useOllama";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Terminal, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface OllamaSetupProps {
  onReady?: () => void;
  targetModel?: string;
}

export function OllamaSetup({ onReady, targetModel = "phi3:mini" }: OllamaSetupProps) {
  const { isLoading, isOllamaRunning, isModelInstalled, checkStatus } = useOllama(targetModel);

  React.useEffect(() => {
    if (isOllamaRunning && isModelInstalled && onReady) {
      onReady();
    }
  }, [isOllamaRunning, isModelInstalled, onReady]);

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isOllamaRunning && isModelInstalled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="rounded-full bg-green-100 p-3 text-green-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Local AI Ready</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOllamaRunning) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Local AI Setup Required</CardTitle>
          <CardDescription className="pt-2 text-base">
            OBN uses a local AI model for privacy. Install Ollama to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                1
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Install Ollama</p>
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600 hover:underline"
                >
                  Visit ollama.com <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                2
              </div>
              <div className="w-full space-y-1">
                <p className="text-sm font-medium">Run this command</p>
                <div className="mt-2 flex w-full items-center overflow-hidden rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-50">
                  <Terminal className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
                  <code className="no-scrollbar overflow-x-auto whitespace-nowrap font-mono text-sm">
                    ollama run {targetModel}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                3
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Refresh this page</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={checkStatus} className="w-full" size="lg">
            Check Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Running, but model missing
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Model not found: {targetModel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="space-y-2">
          <div className="mt-2 flex items-center rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-50">
            <Terminal className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
            <code className="font-mono text-sm">ollama pull {targetModel}</code>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={checkStatus} className="w-full" size="lg">
          Retry
        </Button>
      </CardFooter>
    </Card>
  );
}
