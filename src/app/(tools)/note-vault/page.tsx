'use client';

import React, { useState } from 'react';
import { useNoteVault } from '@/app/(tools)/note-vault/hooks/useNoteVault';
import { useNoteSearch } from '@/app/(tools)/note-vault/hooks/useNoteSearch';
import { useNoteWorker } from '@/app/(tools)/note-vault/hooks/useNoteWorker';
import { Vault } from 'lucide-react';
import { Note, NoteFormat } from '@/app/(tools)/note-vault/types/note-vault';
import NoteEditor from '@/app/(tools)/note-vault/components/NoteEditor';
import NoteList from '@/app/(tools)/note-vault/components/NoteList';
import NoteToolbar from '@/app/(tools)/note-vault/components/NoteToolbar';
import NoteStats from '@/app/(tools)/note-vault/components/NoteStats';
import { ReturnToToolsButton } from '@/components/ui/ReturnToToolsButton';
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";

export default function NoteVaultPage() {
  const { updateToolState } = useAIChat();

  React.useEffect(() => {
    updateToolState({
      toolName: "Note Vault",
      status: "active"
    });
    return () => updateToolState(null);
  }, [updateToolState]);

  const { notes, collections, isReady, addNote, updateNote, deleteNote } = useNoteVault();
  const { runTask } = useNoteWorker();
  
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('default');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredNotes = useNoteSearch(notes, searchQuery, selectedCollectionId);
  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      format: 'text',
      collectionId: selectedCollectionId,
      isPinned: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisions: []
    };
    addNote(newNote);
    setSelectedNoteId(newNote.id);
  };

  const handleImportFileText = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isTextMime = file.type.startsWith('text/');
    const isSupportedExtension = [
      'md', 'markdown', 'txt', 'text', 'json', 'xml', 'yaml', 'yml', 
      'csv', 'html', 'htm', 'sql', 'env', 'diff', 'js', 'ts', 'tsx', 
      'jsx', 'py', 'css', 'sh', 'bash', 'conf', 'ini', 'cfg'
    ].includes(ext);

    if (!isTextMime && !isSupportedExtension) {
      alert(`Cannot import "${file.name}". Only text, markdown, configuration, or code files are supported.`);
      return;
    }

    try {
      const text = await file.text();
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");

      const extMap: Record<string, NoteFormat> = {
        md: 'markdown', markdown: 'markdown',
        txt: 'text', text: 'text',
        json: 'json',
        xml: 'xml',
        yaml: 'yaml', yml: 'yaml',
        csv: 'csv',
        html: 'html', htm: 'html',
        sql: 'sql',
        env: 'env',
        diff: 'diff'
      };

      let format = extMap[ext] || 'text';
      if (format === 'text' && text.trim()) {
        try {
          const detected = await runTask('DETECT_FORMAT', text) as NoteFormat;
          if (detected) format = detected;
        } catch (err) {
          console.error("Format detection failed:", err);
        }
      }

      const newNote: Note = {
        id: crypto.randomUUID(),
        title: nameWithoutExt || 'Imported Note',
        content: text,
        format: format,
        collectionId: selectedCollectionId,
        isPinned: false,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revisions: []
      };

      addNote(newNote);
      setSelectedNoteId(newNote.id);
    } catch (err) {
      console.error("Failed to read file", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      await handleImportFileText(file);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      await handleImportFileText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isReady) {
    return (
      <div className="flex flex-col h-screen bg-(--background) text-(--text-primary)">
        <div className="flex-1 flex items-center justify-center">
            <p className="text-(--text-muted)">Loading NoteVault...</p>
        </div>
      </div>
    );
  }

  const handleExportNote = (note: Note) => {
    const extMap: Record<NoteFormat, string> = {
      text: 'txt', markdown: 'md', code: 'txt', json: 'json', xml: 'xml',
      yaml: 'yaml', csv: 'csv', html: 'html', sql: 'sql', env: 'env', diff: 'diff', regex: 'txt'
    };
    const ext = extMap[note.format] || 'txt';
    const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.${ext}`;
    const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAutoDetect = async (note: Note) => {
    if (!note.content.trim()) return;
    try {
      const format = await runTask('DETECT_FORMAT', note.content) as NoteFormat;
      if (format && format !== note.format) {
        updateNote({ ...note, format });
      }
    } catch (e) {
      console.error('Format auto-detect failed', e);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen bg-(--background) text-(--text-primary) font-display overflow-hidden relative"
    >
      <header className="h-14 border-b border-(--border-subtle) bg-(--surface-overlay)/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
         <div className="flex items-center text-sm text-(--text-muted) gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600">
               <Vault size={16} />
            </div>
            <span className="font-semibold text-(--text-primary)">NoteVault</span>
         </div>
         <div className="flex items-center gap-2">
              <button 
                onClick={handleImportClick}
                className="bg-(--surface-hover) border border-(--border-subtle) hover:bg-(--surface-active) text-(--text-primary) px-3 py-1.5 rounded-lg font-medium transition-colors text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import
              </button>
              <button 
                onClick={handleCreateNote}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm cursor-pointer"
              >
                + New Note
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.markdown,.txt,.text,.json,.xml,.yaml,.yml,.csv,.html,.htm,.sql,.env,.diff,.js,.ts,.tsx,.jsx,.py,.css,.sh,.bash,.conf,.ini,.cfg"
                className="hidden"
                onChange={handleFileChange}
              />
             <ReturnToToolsButton />
         </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-64 border-r border-(--border-subtle) flex flex-col bg-(--surface-hover)/30 shrink-0">
            <div className="p-4 border-b border-(--border-subtle) flex flex-col gap-3">
                <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-(--background) border border-(--border-subtle) rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition-colors text-(--text-primary) placeholder-(--text-muted)"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                    <div className="text-xs font-semibold text-(--text-muted) mb-2 px-2 uppercase tracking-wider">Collections</div>
                    {collections.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => setSelectedCollectionId(c.id)}
                          className={`px-2 py-1.5 rounded-md cursor-pointer text-sm flex items-center justify-between group ${selectedCollectionId === c.id ? 'bg-(--surface-active) text-(--text-primary)' : 'text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)'}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}}></span>
                                {c.name}
                            </span>
                            <span className="text-xs text-(--text-faint) group-hover:text-(--text-muted)">
                                {notes.filter(n => n.collectionId === c.id).length}
                            </span>
                        </div>
                    ))}
                </div>
                
                <div className="p-2 border-t border-(--border-subtle)">
                    <div className="text-xs font-semibold text-(--text-muted) mb-2 px-2 uppercase tracking-wider">Notes</div>
                    <NoteList 
                        notes={filteredNotes} 
                        selectedId={selectedNoteId} 
                        onSelect={setSelectedNoteId} 
                    />
                </div>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-(--background) min-w-0">
            {selectedNote ? (
                <>
                    <NoteToolbar 
                        note={selectedNote} 
                        onChange={(updates) => updateNote({...selectedNote, ...updates})}
                        onDelete={() => {
                            deleteNote(selectedNote.id);
                            setSelectedNoteId(null);
                        }}
                        onExport={() => handleExportNote(selectedNote)}
                        onAutoDetect={() => handleAutoDetect(selectedNote)}
                    />
                    <div className="flex-1 overflow-hidden relative">
                        <NoteEditor 
                            note={selectedNote} 
                            onChange={(content) => updateNote({...selectedNote, content})} 
                        />
                    </div>
                    <NoteStats note={selectedNote} />
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-(--text-muted)">
                    Select or create a note to begin
                </div>
            )}
        </div>
      </div>
      {isDraggingFile && (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] border-2 border-dashed border-blue-500/50 rounded-xl m-4 flex flex-col items-center justify-center z-50 transition-all duration-300 pointer-events-auto"
        >
          <div className="bg-(--surface-overlay) p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-(--border-subtle) max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-inner">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-(--text-primary) mb-1">Import file as note</h3>
              <p className="text-sm text-(--text-muted) px-4">Release to automatically parse and import markdown, code, configuration, or text files.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
