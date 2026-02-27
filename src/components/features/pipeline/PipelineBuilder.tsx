'use client';

/**
 * PipelineBuilder — the main orchestrator component.
 * Assembles all sub-components into a complete pipeline building experience.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
    Play, Square, RotateCcw, Plus, Upload, Layers,
    BookOpen, Trash2, Download, ChevronDown, ChevronUp,
    Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { PipelineStepCard } from './PipelineStepCard';
import { StepSelector } from './StepSelector';
import { PipelineGraph } from './PipelineGraph';
import { PipelineOutput } from './PipelineOutput';

import { TIPToolRegistry } from '@/tip/registry';
import { bundleFromFile } from '@/tip/bundle';
import type { TIPTool, TIPConfig, TIPContentType } from '@/tip/protocol';
import type { PipelineStep, PipelineDefinition } from '@/types/pipeline';
import { usePipelineEngine } from '@/hooks/usePipelineEngine';
import { usePipelines } from '@/hooks/usePipelines';
import { PIPELINE_PRESETS } from '@/config/pipeline-presets';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Internal step type (includes UI-only fields) ─────────────────────────────

interface BuilderStep {
    instanceId: string;
    tool: TIPTool;
    config: TIPConfig;
}

function defaultConfig(tool: TIPTool): TIPConfig {
    return Object.fromEntries(tool.configSchema.fields.map((f) => [f.key, f.default]));
}

function detectContentType(file: File): TIPContentType {
    const type = file.type as TIPContentType;
    // Fall back based on extension if browser reports generic type
    if (!type || type === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const map: Record<string, TIPContentType> = {
            pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
            jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
            txt: 'text/plain', csv: 'text/csv', html: 'text/html',
            htm: 'text/html', json: 'application/json', zip: 'application/zip',
        };
        return map[ext ?? ''] ?? 'application/octet-stream';
    }
    return type;
}

function currentOutputType(steps: BuilderStep[], inputType: TIPContentType): TIPContentType {
    if (steps.length === 0) return inputType;
    const last = steps[steps.length - 1];
    return last.tool.produces[0] ?? inputType;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineBuilder() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [steps, setSteps] = useState<BuilderStep[]>([]);
    const [showSelector, setShowSelector] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [pipelineName, setPipelineName] = useState('My Pipeline');
    const [showSavePanel, setShowSavePanel] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importWarning, setImportWarning] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const { state, output, run, cancel, reset: resetEngine } = usePipelineEngine();
    const { pipelines, save, remove, exportJson, importJson } = usePipelines();

    const isRunning = state.status === 'running';
    const isComplete = state.status === 'complete';

    // ── File handling ─────────────────────────────────────────────────────────────

    const handleFileDrop = useCallback((files: FileList | null) => {
        const f = files?.[0];
        if (!f) return;
        setFile(f);
        setSteps([]);     // reset steps when file changes
        resetEngine();
    }, [resetEngine]);

    // ── Derived state ─────────────────────────────────────────────────────────────

    const inputType: TIPContentType = file ? detectContentType(file) : 'application/octet-stream';
    const outputType = currentOutputType(steps, inputType);

    // ── Step management ───────────────────────────────────────────────────────────

    const addStep = useCallback((tool: TIPTool) => {
        setSteps((prev) => [
            ...prev,
            { instanceId: crypto.randomUUID(), tool, config: defaultConfig(tool) },
        ]);
    }, []);

    const removeStep = useCallback((instanceId: string) => {
        setSteps((prev) => prev.filter((s) => s.instanceId !== instanceId));
    }, []);

    const updateConfig = useCallback((instanceId: string, key: string, value: string | number | boolean) => {
        setSteps((prev) =>
            prev.map((s) =>
                s.instanceId === instanceId
                    ? { ...s, config: { ...s.config, [key]: value } }
                    : s
            )
        );
    }, []);

    const clearSteps = useCallback(() => {
        setSteps([]);
        resetEngine();
    }, [resetEngine]);

    // ── Preset loading ────────────────────────────────────────────────────────────

    const loadPreset = useCallback((preset: PipelineDefinition) => {
        const built: BuilderStep[] = [];
        for (const step of preset.steps) {
            const tool = TIPToolRegistry.get(step.toolId);
            if (!tool) continue;
            built.push({ instanceId: crypto.randomUUID(), tool, config: { ...step.config } });
        }
        setSteps(built);
        setPipelineName(preset.name);
        setShowPresets(false);
        resetEngine();
    }, [resetEngine]);

    // ── Run pipeline ──────────────────────────────────────────────────────────────

    const handleRun = useCallback(async () => {
        if (!file || steps.length === 0) return;
        const pipelineSteps: PipelineStep[] = steps.map((s) => ({
            id: s.instanceId,
            toolId: s.tool.id,
            config: s.config,
        }));
        await run(pipelineSteps, file);
    }, [file, steps, run]);

    // ── Save pipeline ─────────────────────────────────────────────────────────────

    const handleSave = useCallback(() => {
        if (steps.length === 0) return;
        const def: PipelineDefinition = {
            id: crypto.randomUUID(),
            name: pipelineName,
            steps: steps.map((s) => ({ id: s.instanceId, toolId: s.tool.id, config: s.config })),
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
        };
        save(def);
        setShowSavePanel(false);
    }, [steps, pipelineName, save]);

    // ── Import ────────────────────────────────────────────────────────────────────

    const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImportError(null);
        setImportWarning(null);
        const result = await importJson(f);
        if (!result.success) {
            setImportError(result.errors.join('. '));
        } else {
            if (result.warnings.length > 0) setImportWarning(result.warnings[0]);
            if (result.pipeline) loadPreset(result.pipeline);
        }
        e.target.value = '';
    }, [importJson, loadPreset]);

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6">

            {/* ── Section 1: File Drop ────────────────────────────────────────────────── */}
            <section>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    1 — Upload your file
                </h2>

                {file ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                            <Upload className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">
                                {(file.size / 1024).toFixed(1)} KB · <span className="font-mono text-violet-500">{inputType}</span>
                            </p>
                        </div>
                        {!isRunning && (
                            <button
                                onClick={() => { setFile(null); setSteps([]); resetEngine(); }}
                                className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
                            isDragOver
                                ? 'border-violet-400 bg-violet-50 scale-[1.01]'
                                : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50/50 bg-white'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileDrop(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-violet-100/60 flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-6 h-6 text-violet-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Drop any file here</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPEG, WebP, TXT, JSON…</p>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileDrop(e.target.files)} />
                    </div>
                )}
            </section>

            {/* ── Section 2: Pipeline Graph ───────────────────────────────────────────── */}
            {(steps.length > 0 || file) && (
                <section>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Pipeline Flow
                    </h2>
                    <div className="p-3 rounded-xl border border-gray-200 bg-white">
                        <PipelineGraph
                            tools={steps.map((s) => s.tool)}
                            stepStates={state.steps}
                            inputContentType={inputType}
                        />
                    </div>
                </section>
            )}

            {/* ── Section 3: Steps ────────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        2 — Build your pipeline
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Presets */}
                        <button
                            onClick={() => setShowPresets((v) => !v)}
                            className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Presets
                        </button>
                        {/* Import */}
                        <button
                            onClick={() => importRef.current?.click()}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Import
                        </button>
                        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

                        {steps.length > 0 && !isRunning && (
                            <button
                                onClick={clearSteps}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Import error/warning */}
                <AnimatePresence>
                    {importError && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                            ❌ {importError}
                        </motion.div>
                    )}
                    {importWarning && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                            ⚠️ {importWarning}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Preset selector */}
                <AnimatePresence>
                    {showPresets && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-4"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
                                {[...PIPELINE_PRESETS, ...pipelines.filter((p) => !p.isPreset)].map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => loadPreset(preset)}
                                        className="group text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 transition-all duration-150"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-800 group-hover:text-violet-700">
                                                    {preset.name}
                                                    {preset.isPreset && (
                                                        <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-500 px-1.5 py-0.5 rounded-full font-medium">
                                                            Preset
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{preset.description}</p>
                                            </div>
                                            <div className="shrink-0 text-[11px] text-gray-300 font-medium pt-0.5">
                                                {preset.steps.length} steps
                                            </div>
                                        </div>
                                        {!preset.isPreset && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); remove(preset.id); }}
                                                className="mt-2 text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Steps list */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.instanceId}
                                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.2 }}
                            >
                                <PipelineStepCard
                                    index={i}
                                    tool={step.tool}
                                    config={step.config}
                                    stepState={state.steps[i]}
                                    onConfigChange={(key, val) => updateConfig(step.instanceId, key, val)}
                                    onRemove={() => removeStep(step.instanceId)}
                                    isRunning={isRunning}
                                    isLast={i === steps.length - 1}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Add step button + selector */}
                    {!isRunning && (
                        <div className="relative">
                            <button
                                onClick={() => setShowSelector((v) => !v)}
                                disabled={!file}
                                className={cn(
                                    'w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-medium transition-all duration-200',
                                    !file && 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400',
                                    file && 'border-violet-200 text-violet-500 hover:border-violet-400 hover:bg-violet-50/40 cursor-pointer'
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Add Step
                                {file && steps.length > 0 && (
                                    <span className="text-xs text-gray-400 font-normal ml-1">
                                        (from <span className="font-mono text-violet-400">{outputType.split('/')[1]}</span>)
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showSelector && file && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        className="absolute z-20 top-full left-0 right-0 mt-2"
                                    >
                                        <StepSelector
                                            currentContentType={outputType}
                                            onSelect={addStep}
                                            onClose={() => setShowSelector(false)}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Section 4: Run Controls ─────────────────────────────────────────────── */}
            {steps.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 flex-wrap">
                        {!isRunning && !isComplete && (
                            <Button
                                onClick={handleRun}
                                disabled={!file || steps.length === 0}
                                className="gap-2"
                                size="lg"
                            >
                                <Play className="w-4 h-4" />
                                Run Pipeline
                            </Button>
                        )}

                        {isRunning && (
                            <Button onClick={cancel} variant="danger" className="gap-2" size="lg">
                                <Square className="w-4 h-4" />
                                Cancel
                            </Button>
                        )}

                        {(isComplete || state.status === 'error') && (
                            <Button onClick={() => { resetEngine(); }} variant="outline" className="gap-2">
                                <RotateCcw className="w-4 h-4" />
                                Run Again
                            </Button>
                        )}

                        {/* Save */}
                        {steps.length > 0 && !isRunning && (
                            <button
                                onClick={() => setShowSavePanel((v) => !v)}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <BookOpen className="w-4 h-4" />
                                Save Pipeline
                            </button>
                        )}
                    </div>

                    {/* Error state */}
                    {state.status === 'error' && state.error && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"
                        >
                            ❌ {state.error}
                        </motion.div>
                    )}

                    {/* Save panel */}
                    <AnimatePresence>
                        {showSavePanel && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white">
                                    <input
                                        type="text"
                                        value={pipelineName}
                                        onChange={(e) => setPipelineName(e.target.value)}
                                        placeholder="Pipeline name…"
                                        className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    />
                                    <Button onClick={handleSave} size="sm">Save</Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const def: PipelineDefinition = {
                                                id: crypto.randomUUID(),
                                                name: pipelineName,
                                                steps: steps.map((s) => ({ id: s.instanceId, toolId: s.tool.id, config: s.config })),
                                                createdAt: new Date().toISOString(),
                                                tipVersion: '1.0',
                                            };
                                            exportJson(def);
                                        }}
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Export
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            )}

            {/* ── Section 5: Output ───────────────────────────────────────────────────── */}
            <AnimatePresence>
                {isComplete && output && (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            3 — Download your result
                        </h2>
                        <PipelineOutput
                            output={output}
                            initialSizeBytes={file?.size ?? 0}
                            stepStates={state.steps}
                            onReset={() => { resetEngine(); setSteps([]); setFile(null); }}
                        />
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}
