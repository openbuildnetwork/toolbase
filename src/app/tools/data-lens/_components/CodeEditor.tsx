
import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Play } from 'lucide-react';

interface CodeEditorProps {
    code: string;
    onChange: (value: string) => void;
    language: 'sql' | 'python';
    onRun: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language, onRun }) => {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRun();
        });
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{language} Query</span>
                </div>
                <div className="text-xs text-gray-400">Ctrl + Enter to Run</div>
            </div>
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={(value) => onChange(value || "")}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        fontFamily: 'JetBrains Mono, monospace',
                    }}
                />
            </div>
        </div>
    );
};
