import { useCallback, useState } from "react";
import type {
  AISuggestions,
  SmartModeConfig,
  SmartModeSourceFile,
} from "@/lib/smart-mode";
import {
  analyzeSourceFiles,
  combinedMaterial,
  createSourceFileEntry,
  processSourceFile,
} from "@/lib/smart-mode";
import type { LengthPreset } from "@/lib/types";
import { LENGTH_PRESETS, presetForSliderValue } from "@/lib/length-detail";
import type { QuestionType } from "@/lib/types";

export interface UseSmartModeResult {
  config: SmartModeConfig;
  suggestions: AISuggestions;
  setConfig: (config: Partial<SmartModeConfig>) => void;
  setSuggestions: (suggestions: Partial<AISuggestions>) => void;
  addFiles: (files: File[]) => void;
  processFiles: (files?: SmartModeSourceFile[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  isLoading: boolean;
  material: string;
}

export function useSmartMode(initialConfig?: Partial<SmartModeConfig>): UseSmartModeResult {
  const [config, setConfigState] = useState<SmartModeConfig>({
    enabled: initialConfig?.enabled ?? false,
    sourceFiles: initialConfig?.sourceFiles ?? [],
    autoConfigure: initialConfig?.autoConfigure ?? true,
    lengthPreset: initialConfig?.lengthPreset ?? "regular",
    lengthSliderValue: initialConfig?.lengthSliderValue ?? 50,
  });

  const [suggestions, setSuggestionsState] = useState<AISuggestions>({});
  const [isLoading, setIsLoading] = useState(false);

  const setConfig = useCallback((updates: Partial<SmartModeConfig>) => {
    setConfigState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setSuggestions = useCallback((updates: Partial<AISuggestions>) => {
    setSuggestionsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const entries = files.map(createSourceFileEntry);
    setConfigState((prev) => ({
      ...prev,
      enabled: true,
      sourceFiles: [...prev.sourceFiles, ...entries],
    }));
  }, []);

  const processFiles = useCallback(async (targets?: SmartModeSourceFile[]) => {
    const candidates = (targets ?? config.sourceFiles).filter(
      (file) => file.processingStatus !== "completed",
    );
    if (!candidates.length) return;

    setIsLoading(true);
    try {
      setConfigState((prev) => ({
        ...prev,
        sourceFiles: prev.sourceFiles.map((file) =>
          candidates.some((candidate) => candidate.id === file.id)
            ? { ...file, processingStatus: "processing" as const, processingError: undefined }
            : file,
        ),
      }));

      const processed: SmartModeSourceFile[] = [];
      for (const file of candidates) {
        processed.push(await processSourceFile({ ...file, processingStatus: "processing" }));
      }

      const nextFiles = config.sourceFiles.map(
        (file) => processed.find((candidate) => candidate.id === file.id) ?? file,
      );
      setConfigState((prev) => ({ ...prev, sourceFiles: nextFiles }));

      // Analyse the combined text and propose a starting configuration.
      const analysis = await analyzeSourceFiles(nextFiles);
      if (analysis.suggestions) {
        setSuggestionsState((prev) => ({ ...prev, ...analysis.suggestions }));
      }
      if (config.autoConfigure) {
        setConfigState((prev) => ({
          ...prev,
          autoConfigure: true,
          lengthPreset: analysis.config.lengthPreset,
          lengthSliderValue: analysis.config.lengthSliderValue,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [config.autoConfigure, config.sourceFiles]);

  const removeFile = useCallback((id: string) => {
    setConfigState((prev) => ({
      ...prev,
      sourceFiles: prev.sourceFiles.filter((file) => file.id !== id),
    }));
  }, []);

  const clearFiles = useCallback(() => {
    setConfigState((prev) => ({
      ...prev,
      sourceFiles: [],
      enabled: false,
      autoConfigure: true,
    }));
    setSuggestionsState({});
  }, []);

  return {
    config,
    suggestions,
    setConfig,
    setSuggestions,
    addFiles,
    processFiles,
    removeFile,
    clearFiles,
    isLoading,
    material: combinedMaterial(config.sourceFiles),
  };
}

/** Shared length/detail state used by Prompt Studio surfaces. */
export function useLengthSettings(
  initialPreset: LengthPreset = "regular",
  initialSliderValue: number = LENGTH_PRESETS[initialPreset].sliderValue,
) {
  const [lengthPreset, setLengthPresetState] = useState<LengthPreset>(initialPreset);
  const [lengthSliderValue, setLengthSliderValue] = useState<number>(initialSliderValue);

  const setPreset = useCallback((preset: LengthPreset) => {
    setLengthPresetState(preset);
    setLengthSliderValue(LENGTH_PRESETS[preset].sliderValue);
  }, []);

  const setSliderValue = useCallback((value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    setLengthSliderValue(clamped);
    setLengthPresetState(presetForSliderValue(clamped));
  }, []);

  return {
    lengthPreset,
    lengthSliderValue,
    setPreset,
    setSliderValue,
  };
}

/** Kept for callers that only need the type list. */
export type { QuestionType };
