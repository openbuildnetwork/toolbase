"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTIPTool } from '@/hooks/useTIPTool';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { Download, Copy, Link2, ScanLine, Camera, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const CameraScanner = ({ onScan, isProcessing }: { onScan: (file: File) => void, isProcessing: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        interval = setInterval(() => {
          if (isProcessing) return;
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              canvas.toBlob(blob => {
                if (blob) {
                  const file = new File([blob], 'camera-frame.jpg', { type: 'image/jpeg' });
                  onScan(file);
                }
              }, 'image/jpeg');
            }
          }
        }, 800);
      } catch (err) {
        setError('Camera access denied or unavailable.');
      }
    };
    
    startCamera();
    
    return () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [onScan, isProcessing]);

  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center">{error}</div>;

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <div className="absolute inset-0 border-2 border-primary/50 m-8 rounded-lg animate-pulse pointer-events-none" />
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm drop-shadow-md">
        Point camera at QR code
      </div>
    </div>
  );
};

export default function QrForgeFeature() {
  const [activeMode, setActiveMode] = useState<'url2qr' | 'qr2url'>('url2qr');
  const [showCamera, setShowCamera] = useState(false);

  // Generators
  const genTool = useTIPTool('qr-forge/generate');
  const decTool = useTIPTool('qr-forge/decode');

  // State
  const [textInput, setTextInput] = useState('https://toolbase.app');
  const [genResult, setGenResult] = useState<string | null>(null);
  const [decResult, setDecResult] = useState<{ text?: string, objectUrl?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (activeMode === 'url2qr' && !textInput) {
      setGenResult(null);
      return;
    }

    try {
      setErrorMsg(null);
      const payloadFiles = [new File([new Blob([''])], 'dummy.txt', { type: 'text/plain' })];
      
      const config = {
        text: activeMode === 'url2qr' ? textInput : ''
      };

      const results = await genTool.execute(payloadFiles, config as Record<string, string | number | boolean>, {
        onError: (err) => { throw err; }
      });
      if (results && results.length > 0) {
        if (genResult) URL.revokeObjectURL(genResult);
        setGenResult(URL.createObjectURL(results[0]));
      }
    } catch (err) {
      setErrorMsg('Error generating QR code: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [textInput, activeMode, genTool, genResult]);

  // Real-time Preview Debounce for URL to QR
  const handleGenerateRef = useRef(handleGenerate);
  useEffect(() => {
    handleGenerateRef.current = handleGenerate;
  }, [handleGenerate]);

  useEffect(() => {
    if (activeMode === 'url2qr') {
      const handler = setTimeout(() => {
        handleGenerateRef.current();
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [textInput, activeMode]);

  const handleDecode = useCallback(async (fileToDecode: File) => {
    if (decTool.isProcessing) return;
    try {
      setErrorMsg(null);
      const results = await decTool.execute([fileToDecode], {}, {
        onError: (err) => { throw err; }
      });
      if (results && results.length > 0) {
        const text = await results[0].text();
        setShowCamera(false);
        setDecResult({ text, objectUrl: URL.createObjectURL(fileToDecode) });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (showCamera) {
        console.warn("Scan failed:", msg);
      } else {
        if (msg.toLowerCase().includes('no qr code') || msg.includes('worker error') || msg.includes('Runtime error')) {
          setErrorMsg('Invalid image or no QR code detected. Please check the image and try again.');
        } else {
          setErrorMsg('Error decoding QR code: ' + msg);
        }
      }
    }
  }, [decTool, showCamera]);

  const downloadResult = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 animate-in fade-in slide-in-from-top-2">
          {errorMsg}
        </div>
      )}

      {/* Modes Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: 'url2qr', icon: Link2, label: 'Link → QR Code', desc: 'Create QR from URL' },
          { id: 'qr2url', icon: ScanLine, label: 'QR Code → Link', desc: 'Scan QR to get Link' },
        ].map(m => (
          <Card
            key={m.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-primary/50 hover:shadow-md",
              activeMode === m.id && "border-primary bg-primary/5 shadow-md scale-[1.02]"
            )}
            onClick={() => {
              setActiveMode(m.id as 'url2qr' | 'qr2url');
              setGenResult(null);
              setDecResult(null);
              setErrorMsg(null);
              setShowCamera(false);
            }}
          >
            <m.icon className={cn("w-6 h-6 mb-2 transition-colors", activeMode === m.id ? "text-primary" : "text-muted-foreground")} />
            <div className="font-semibold">{m.label}</div>
            <div className="text-xs text-muted-foreground">{m.desc}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 overflow-hidden relative">
        {activeMode === 'url2qr' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <Label>Content (URL or Text)</Label>
              <Input
                value={textInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextInput(e.target.value)}
                placeholder="https://example.com"
                className="text-lg py-6"
              />
            </div>
            
            <div className="flex flex-col items-center gap-4 pt-6 border-t min-h-[300px] justify-center">
              {genTool.isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span>Generating QR Code...</span>
                </div>
              ) : genResult ? (
                <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                  <div className="p-4 bg-white rounded-xl border shadow-sm transition-transform hover:scale-105">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={genResult} alt="Generated QR" className="max-w-[250px] w-full h-auto" />
                  </div>
                  <Button onClick={() => downloadResult(genResult, 'qr-code.png')} className="gap-2 shadow-sm w-full">
                    <Download className="w-4 h-4" /> Download QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">Enter a link to generate your QR code.</div>
              )}
            </div>
          </div>
        )}

        {activeMode === 'qr2url' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base">Upload or Scan QR Code</Label>
              <Button 
                variant={showCamera ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowCamera(!showCamera)}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {showCamera ? "Close Camera" : "Use Camera"}
              </Button>
            </div>

            {showCamera ? (
              <CameraScanner onScan={handleDecode} isProcessing={decTool.isProcessing} />
            ) : (
              <FileDropZone 
                onFileSelected={(f) => f && handleDecode(f)} 
                accept="image/*" 
              />
            )}

            {decTool.isProcessing && !showCamera && (
               <div className="flex justify-center items-center gap-2 py-8 text-muted-foreground animate-pulse">
                 <RefreshCw className="w-5 h-5 animate-spin" />
                 <span>Decoding QR Code...</span>
               </div>
            )}

            {decResult && !decTool.isProcessing && (
              <div className="space-y-6 pt-6 border-t animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <Label className="text-xs uppercase tracking-wider text-primary mb-2 block font-bold">Extracted Link</Label>
                  <div className="font-mono text-base break-all text-foreground">{decResult.text}</div>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => copyText(decResult.text || '')} className="gap-2 shadow-sm flex-1">
                    <Copy className="w-4 h-4" /> Copy Link
                  </Button>
                  {decResult.text?.startsWith('http') && (
                    <Button onClick={() => window.open(decResult.text, '_blank')} className="gap-2 shadow-sm flex-1">
                      <Link2 className="w-4 h-4" /> Open Link
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
