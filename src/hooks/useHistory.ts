"use client";
/**
 * useHistory - Generic Undo/Redo History Stack
 * 
 * Features:
 * - Configurable history size limit
 * - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y)
 * - State batching to prevent excessive history entries
 * - Immutable state management
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// --- Types ---
interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseHistoryOptions {
    /** Maximum number of history entries to keep (default: 50) */
    maxHistory?: number;
    /** Enable keyboard shortcuts (default: true) */
    enableKeyboardShortcuts?: boolean;
    /** Debounce time in ms for batching rapid changes (default: 300) */
    debounceMs?: number;
}

interface UseHistoryReturn<T> {
    /** Current state */
    state: T;
    /** Set state and add to history */
    setState: (newState: T | ((prev: T) => T)) => void;
    /** Set state immediately without debounce */
    setStateImmediate: (newState: T | ((prev: T) => T)) => void;
    /** Undo last change */
    undo: () => void;
    /** Redo last undone change */
    redo: () => void;
    /** Check if undo is available */
    canUndo: boolean;
    /** Check if redo is available */
    canRedo: boolean;
    /** Number of available undo steps */
    undoCount: number;
    /** Number of available redo steps */
    redoCount: number;
    /** Clear all history */
    clearHistory: () => void;
    /** Replace current state without adding to history */
    replaceState: (newState: T) => void;
}

// --- Constants ---
const DEFAULT_MAX_HISTORY = 50;
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * A generic hook for managing undo/redo history.
 * 
 * @param initialState - The initial state value
 * @param options - Configuration options
 * @returns History-managed state and control methods
 */
export function useHistory<T>(
    initialState: T,
    options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
    const {
        maxHistory = DEFAULT_MAX_HISTORY,
        enableKeyboardShortcuts = true,
        debounceMs = DEFAULT_DEBOUNCE_MS,
    } = options;

    // Main history state
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: [],
    });

    // Refs for debouncing
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingStateRef = useRef<T | null>(null);

    /**
     * Set state with debouncing for batching rapid changes.
     */
    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        // Clear any pending debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Calculate the new state value
        setHistory((current) => {
            const nextState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(current.present)
                : newState;

            // Store as pending
            pendingStateRef.current = nextState;

            // Return immediately updated present (for UI responsiveness)
            return {
                ...current,
                present: nextState,
            };
        });

        // Debounce the history entry
        debounceTimeoutRef.current = setTimeout(() => {
            if (pendingStateRef.current !== null) {
                setHistory((current) => {
                    // Don't add if state hasn't actually changed
                    if (pendingStateRef.current === current.present) {
                        return current;
                    }

                    const newPast = [...current.past, current.present].slice(-maxHistory);

                    return {
                        past: newPast,
                        present: pendingStateRef.current as T,
                        future: [], // Clear future on new change
                    };
                });
                pendingStateRef.current = null;
            }
            debounceTimeoutRef.current = null;
        }, debounceMs);
    }, [maxHistory, debounceMs]);

    /**
     * Set state immediately without debouncing.
     */
    const setStateImmediate = useCallback((newState: T | ((prev: T) => T)) => {
        // Clear any pending debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }
        pendingStateRef.current = null;

        setHistory((current) => {
            const nextState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(current.present)
                : newState;

            // Don't add duplicate states
            if (JSON.stringify(nextState) === JSON.stringify(current.present)) {
                return current;
            }

            const newPast = [...current.past, current.present].slice(-maxHistory);

            return {
                past: newPast,
                present: nextState,
                future: [], // Clear future on new change
            };
        });
    }, [maxHistory]);

    /**
     * Undo the last change.
     */
    const undo = useCallback(() => {
        // Flush any pending changes first
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }

        setHistory((current) => {
            if (current.past.length === 0) {
                return current;
            }

            const previous = current.past[current.past.length - 1];
            const newPast = current.past.slice(0, -1);

            return {
                past: newPast,
                present: previous,
                future: [current.present, ...current.future],
            };
        });
    }, []);

    /**
     * Redo the last undone change.
     */
    const redo = useCallback(() => {
        setHistory((current) => {
            if (current.future.length === 0) {
                return current;
            }

            const next = current.future[0];
            const newFuture = current.future.slice(1);

            return {
                past: [...current.past, current.present],
                present: next,
                future: newFuture,
            };
        });
    }, []);

    /**
     * Clear all history.
     */
    const clearHistory = useCallback(() => {
        setHistory((current) => ({
            past: [],
            present: current.present,
            future: [],
        }));
    }, []);

    /**
     * Replace current state without adding to history.
     */
    const replaceState = useCallback((newState: T) => {
        setHistory((current) => ({
            ...current,
            present: newState,
        }));
    }, []);

    /**
     * Handle keyboard shortcuts.
     */
    useEffect(() => {
        if (!enableKeyboardShortcuts) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl/Cmd key
            const isModifier = event.ctrlKey || event.metaKey;

            if (!isModifier) return;

            // Undo: Ctrl+Z
            if (event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            }

            // Redo: Ctrl+Shift+Z or Ctrl+Y
            if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enableKeyboardShortcuts, undo, redo]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    return {
        state: history.present,
        setState,
        setStateImmediate,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        undoCount: history.past.length,
        redoCount: history.future.length,
        clearHistory,
        replaceState,
    };
}

export type { UseHistoryOptions, UseHistoryReturn };
