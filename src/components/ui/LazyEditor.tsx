import dynamic from 'next/dynamic';
import React from 'react';
import type { EditorProps } from '@monaco-editor/react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[400px] items-center justify-center bg-(--surface-overlay) text-(--text-muted) text-sm rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span className="font-medium tracking-wide">Loading Editor...</span>
      </div>
    </div>
  ),
});

declare global {
  interface Window {
    __ECHO_EDITORS__: Map<string, string>;
  }
}

export const LazyEditor: React.FC<EditorProps> = (props) => {
  const editorIdRef = React.useRef<string>(`editor_${Math.random().toString(36).substring(2, 9)}`);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && props.value !== undefined) {
      if (!window.__ECHO_EDITORS__) window.__ECHO_EDITORS__ = new Map();
      
      const id = editorIdRef.current;
      window.__ECHO_EDITORS__.set(id, props.value);

      return () => {
        window.__ECHO_EDITORS__.delete(id);
      };
    }
  }, [props.value]);

  return <MonacoEditor {...props} />;
};
