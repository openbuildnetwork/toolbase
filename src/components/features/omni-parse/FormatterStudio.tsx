"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { Upload, Wand2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { FormatterRecipe, OmniFixture, RecipeStep, RecipeStepOp } from "./types";

type FormatterStudioProps = {
  validateFormat: "json" | "xml" | "yaml";
  setValidateFormat: (format: "json" | "xml" | "yaml") => void;
  validateInput: string;
  setValidateInput: (value: string) => void;
  formatStats: { lines: number; chars: number };
  jsonToolState: { canFlatten: boolean; canUnflatten: boolean; canEscape: boolean; canUnescape: boolean };
  onFormat: (mode: "beautify" | "minify") => void;
  onSortKeys: () => void;
  onFormatterPreset: (preset: "clean" | "normalize" | "apiReady") => void;
  onSaveFormatterRecipe: () => void;
  onRunDraftRecipe: () => void;
  onAddCurrentAsFixture: () => void;
  onFlatten: () => void;
  onUnflatten: () => void;
  onJsonEscape: () => void;
  onJsonUnescape: () => void;
  recipeNameDraft: string;
  setRecipeNameDraft: (value: string) => void;
  recipeStepOpDraft: RecipeStepOp;
  setRecipeStepOpDraft: (value: RecipeStepOp) => void;
  recipeStepTargetDraft: "json" | "xml" | "yaml";
  setRecipeStepTargetDraft: React.Dispatch<React.SetStateAction<"json" | "xml" | "yaml">>;
  recipeStepsDraft: RecipeStep[];
  onAddRecipeStepDraft: () => void;
  onClearRecipeStepsDraft: () => void;
  onMoveRecipeStep: (id: string, direction: "up" | "down") => void;
  onRemoveRecipeStep: (id: string) => void;
  formatterRecipes: FormatterRecipe[];
  onLoadFormatterRecipe: (id: string) => void;
  onRunSavedRecipe: (id: string) => void;
  fixtureCases: OmniFixture[];
  setFixtureCases: React.Dispatch<React.SetStateAction<OmniFixture[]>>;
  fixtureResults: { id: string; name: string; passed: boolean; detail: string }[];
  onRunFixtureTests: () => void;
  onExportFixturePack: () => void;
  onImportFixturePack: (file: File) => void;
  fixtureImportRef: React.RefObject<HTMLInputElement | null>;
  languageMap: Record<string, string>;
};

export function FormatterStudio({
  validateFormat,
  setValidateFormat,
  validateInput,
  setValidateInput,
  formatStats,
  jsonToolState,
  onFormat,
  onSortKeys,
  onFormatterPreset,
  onSaveFormatterRecipe,
  onRunDraftRecipe,
  onAddCurrentAsFixture,
  onFlatten,
  onUnflatten,
  onJsonEscape,
  onJsonUnescape,
  recipeNameDraft,
  setRecipeNameDraft,
  recipeStepOpDraft,
  setRecipeStepOpDraft,
  recipeStepTargetDraft,
  setRecipeStepTargetDraft,
  recipeStepsDraft,
  onAddRecipeStepDraft,
  onClearRecipeStepsDraft,
  onMoveRecipeStep,
  onRemoveRecipeStep,
  formatterRecipes,
  onLoadFormatterRecipe,
  onRunSavedRecipe,
  fixtureCases,
  setFixtureCases,
  fixtureResults,
  onRunFixtureTests,
  onExportFixturePack,
  onImportFixturePack,
  fixtureImportRef,
  languageMap,
}: FormatterStudioProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12 space-y-5">
        <Card className="p-0 bg-(--surface-overlay) border-(--border-subtle) shadow-sm overflow-hidden">
          <div className="border-b border-(--border-subtle) bg-linear-to-r from-sky-500/10 via-cyan-500/5 to-transparent px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-(--text-primary)">Formatter Studio</h3>
                </div>
                <p className="mt-1 text-xs text-(--text-muted)">Clean, normalize, and escape payload text quickly.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  {formatStats.lines} lines
                </span>
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  {formatStats.chars} chars
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-2xl border border-(--border-subtle) bg-(--surface-secondary) p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">Format</span>
                <Select
                  value={validateFormat}
                  onChange={(e) => setValidateFormat(e.target.value as "json" | "xml" | "yaml")}
                  className="w-28"
                >
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="yaml">YAML</option>
                </Select>
                <Button variant="secondary" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => onFormat("beautify")}>
                  Beautify
                </Button>
                <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => onFormat("minify")}>
                  Minify
                </Button>
                <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onSortKeys}>
                  Sort Keys
                </Button>
                <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => onFormatterPreset("clean")}>
                  Clean Payload
                </Button>
                <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => onFormatterPreset("normalize")}>
                  Normalize Keys
                </Button>
                <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => onFormatterPreset("apiReady")}>
                  API Ready
                </Button>
                 <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onAddCurrentAsFixture}>
                  Add Fixture
                </Button>
                {validateFormat === "json" ? (
                  <>
                    {jsonToolState.canFlatten && (
                      <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onFlatten}>
                        Flatten
                      </Button>
                    )}
                    {jsonToolState.canUnflatten && (
                      <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onUnflatten}>
                        Unflatten
                      </Button>
                    )}
                    {jsonToolState.canEscape && (
                      <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onJsonEscape}>
                        JSON Escape
                      </Button>
                    )}
                    {jsonToolState.canUnescape && (
                      <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={onJsonUnescape}>
                        JSON Unescape
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-(--text-muted)">JSON-only: Flatten, Unflatten, Escape, Unescape.</span>
                )}
              </div>
            </div>

            <div className="h-[600px] border-(--border-subtle) rounded-xl overflow-hidden bg-(--surface-overlay)">
              <Editor
                height="100%"
                defaultLanguage={languageMap[validateFormat]}
                value={validateInput}
                onChange={(val) => setValidateInput(val || "")}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  padding: { top: 12, bottom: 12 },
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            <div className="rounded-xl border border-(--border-subtle) bg-(--surface-overlay) p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">Pipeline Builder</span>
                <Input value={recipeNameDraft} onChange={(e) => setRecipeNameDraft(e.target.value)} className="h-8 w-48" placeholder="Recipe name" />
                <Select value={recipeStepOpDraft} onChange={(e) => setRecipeStepOpDraft(e.target.value as RecipeStepOp)} className="w-40">
                  <option value="beautify">Beautify</option>
                  <option value="minify">Minify</option>
                  <option value="sortKeys">Sort Keys</option>
                  <option value="flatten">Flatten</option>
                  <option value="unflatten">Unflatten</option>
                  <option value="jsonEscape">JSON Escape</option>
                  <option value="jsonUnescape">JSON Unescape</option>
                  <option value="convert">Convert</option>
                </Select>
                {recipeStepOpDraft === "convert" && (
                  <Select value={recipeStepTargetDraft} onChange={(e) => setRecipeStepTargetDraft(e.target.value as "json" | "xml" | "yaml")} className="w-28">
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="yaml">YAML</option>
                  </Select>
                )}
                <Button variant="outline" size="sm" onClick={onAddRecipeStepDraft}>Add Step</Button>
                <Button variant="outline" size="sm" onClick={onClearRecipeStepsDraft}>Clear Steps</Button>
              </div>
              <div className="max-h-32 overflow-auto space-y-1">
                  {recipeStepsDraft.length === 0 ? (
                    <div className="text-xs text-(--text-muted)">No steps yet. Add operations and run/save the pipeline.</div>
                  ) : recipeStepsDraft.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-2 rounded-md border border-(--border-subtle) px-2 py-1 text-xs">
                      <span className="font-semibold text-(--text-secondary)">{idx + 1}.</span>
                      <span className="capitalize text-(--text-primary)">{step.op}</span>
                      {step.targetFormat && <span className="text-(--text-muted)">→ {step.targetFormat.toUpperCase()}</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => onMoveRecipeStep(step.id, "up")}>↑</Button>
                      <Button variant="outline" size="sm" onClick={() => onMoveRecipeStep(step.id, "down")}>↓</Button>
                      <Button variant="outline" size="sm" onClick={() => onRemoveRecipeStep(step.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {(formatterRecipes.length > 0 || fixtureCases.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-3">
                <div className="rounded-xl border border-(--border-subtle) bg-(--surface-overlay) p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">Saved Recipes</div>
                    <span className="text-xs text-(--text-muted)">{formatterRecipes.length}</span>
                  </div>
                  <div className="mt-2 max-h-28 overflow-auto space-y-1">
                    {formatterRecipes.slice(-8).reverse().map((recipe) => (
                      <div key={recipe.id} className="flex items-center justify-between rounded-md border border-(--border-subtle) px-2 py-1 text-xs">
                        <span className="truncate text-(--text-primary)">{recipe.name} ({recipe.inputFormat})</span>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => onLoadFormatterRecipe(recipe.id)}>Load</Button>
                          <Button variant="outline" size="sm" onClick={() => onRunSavedRecipe(recipe.id)}>Run</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-(--border-subtle) bg-(--surface-overlay) p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">Fixture Tests</div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={onRunFixtureTests}>Run</Button>
                      <Button variant="outline" size="sm" onClick={onExportFixturePack}>Export</Button>
                      <Button variant="outline" size="sm" onClick={() => fixtureImportRef.current?.click()}>
                        <Upload className="w-3 h-3 mr-1" />
                        Import
                      </Button>
                      <input
                        ref={fixtureImportRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onImportFixturePack(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 max-h-48 overflow-auto space-y-1">
                    {fixtureCases.slice(-20).reverse().map((fx) => (
                      <div key={fx.id} className="flex items-center justify-between rounded-md border border-(--border-subtle) px-2 py-1 text-xs">
                        <span className="truncate text-(--text-primary)">{fx.name} ({fx.format}) - expect {fx.expectedValid ? "valid" : "invalid"}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-sky-600 dark:text-sky-400 hover:underline"
                            onClick={() => setFixtureCases((prev) => prev.map((item) => item.id === fx.id ? { ...item, expectedValid: !item.expectedValid } : item))}
                          >
                            Toggle
                          </button>
                          <button
                            type="button"
                            className="text-sky-600 dark:text-sky-400 hover:underline"
                            onClick={() => setFixtureCases((prev) => prev.filter((item) => item.id !== fx.id))}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {fixtureResults.slice(-10).map((res) => (
                      <div key={res.id} className={`rounded-md px-2 py-1 text-xs mt-1 ${res.passed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"}`}>
                        {res.name}: {res.detail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
