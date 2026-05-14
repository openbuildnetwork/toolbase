
import { NodeData } from '@/app/(tools)/open-draw/types/open-draw.types';

const STORAGE_KEY_DEFAULT_STYLE = 'open-draw-default-style';
const STORAGE_KEY_CLIPBOARD_STYLE = 'open-draw-clipboard-style';

export class StyleManager {
    /**
     * Saves the provided style as the default for new shapes.
     * Persists to localStorage.
     */
    static saveDefaultStyle(style: Partial<NodeData>) {
        try {
            // We only want to save style-related properties, not label/id/etc.
            const styleToSave = StyleManager.extractStyleProperties(style);
            localStorage.setItem(STORAGE_KEY_DEFAULT_STYLE, JSON.stringify(styleToSave));
            return true;
        } catch (e) {
            console.error('Failed to save default style', e);
            return false;
        }
    }

    /**
     * Retrieves the default style from localStorage.
     */
    static getDefaultStyle(): Partial<NodeData> {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DEFAULT_STYLE);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load default style', e);
        }
        return {};
    }

    /**
     * Retrieves the clipboard style from localStorage.
     */
    static getClipboardStyle(): Partial<NodeData> | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CLIPBOARD_STYLE);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load clipboard style', e);
        }
        return null; // explicit null if nothing found
    }

    /**
     * Copies the provided style to the "clipboard" (localStorage/sessionStorage for now).
     */
    static copyStyle(style: Partial<NodeData>) {
        try {
            const styleToCopy = StyleManager.extractStyleProperties(style);
            // using localStorage to allow cross-tab copy/paste if desired, or just persistence across reloads
            localStorage.setItem(STORAGE_KEY_CLIPBOARD_STYLE, JSON.stringify(styleToCopy));
            return true;
        } catch (e) {
            console.error('Failed to copy style', e);
            return false;
        }
    }

    /**
     * Helper to extract only style-related properties from NodeData.
     */
    private static extractStyleProperties(data: Partial<NodeData>): Partial<NodeData> {
        return {
            backgroundColor: data.backgroundColor,
            borderColor: data.borderColor,
            borderWidth: data.borderWidth,
            borderStyle: data.borderStyle,
            textColor: data.textColor,
            fontSize: data.fontSize,
            opacity: data.opacity,
            borderRadius: data.borderRadius,
            shadow: data.shadow,
            glass: data.glass,
            sketch: data.sketch,
            gradient: data.gradient,
        };
    }
}
