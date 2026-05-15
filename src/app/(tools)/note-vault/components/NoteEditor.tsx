import React, { useState, useEffect } from 'react';
import { LazyEditor as Editor } from "@/components/ui/LazyEditor";
import { Note } from '@/app/(tools)/note-vault/types/note-vault';
import { useNoteWorker } from '@/app/(tools)/note-vault/hooks/useNoteWorker';
import { ToolCopilot } from "@/components/ai/ToolCopilot";

interface NoteEditorProps {
  note: Note;
  onChange: (content: string) => void;
}

const formatToLanguage = (format: string, customLang?: string) => {
  if (format === 'code' && customLang) return customLang;
  const map: Record<string, string> = {
    'text': 'plaintext',
    'markdown': 'markdown',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'html': 'html',
    'sql': 'sql',
    'css': 'css',
    'diff': 'diff',
    'env': 'shell', // simple highlighting
    'regex': 'regex',
    'csv': 'plaintext',
  };
  return map[format] || 'plaintext';
};

export default function NoteEditor({ note, onChange }: NoteEditorProps) {
  const [content, setContent] = useState(note.content);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const { runTask } = useNoteWorker();
  
  // Sync prop changes during render
  const [prevNoteId, setPrevNoteId] = useState(note.id);
  if (note.id !== prevNoteId) {
    setPrevNoteId(note.id);
    setContent(note.content);
  }
  
  const handleChange = (val: string | undefined) => {
    const newVal = val || '';
    setContent(newVal);
    onChange(newVal);
  };

  useEffect(() => {
    let active = true;
    if (note.format === 'markdown') {
       runTask('MARKDOWN_TO_HTML', content).then(html => {
           if (active) setPreviewHtml(html as string);
       }).catch(() => {});
    } else {
        Promise.resolve().then(() => {
            if (active) setPreviewHtml(null);
        });
    }
    return () => { active = false; };
  }, [content, note.format, runTask]);

  return (
    <div className="flex h-full w-full">
        <div className="flex-1 h-full relative">
            <div className="absolute top-2 right-4 z-50">
                <ToolCopilot 
                    contextData={content}
                    contextType={`${note.format} note`}
                    onApplyFix={handleChange}
                />
            </div>
            <Editor
                height="100%"
                language={formatToLanguage(note.format, note.language)}
                value={content}
                theme="vs-dark"
                onChange={handleChange}
                options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
            />
        </div>
        
        {/* Markdown Preview Pane */}
        {note.format === 'markdown' && (
            <div className="flex-1 h-full border-l border-(--border-subtle) bg-(--background) p-6 overflow-y-auto prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
            </div>
        )}
    </div>
  );
}
