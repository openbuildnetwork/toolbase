import React from 'react';
import { Note } from '@/app/(tools)/note-vault/types/note-vault';

interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function NoteList({ notes, selectedId, onSelect }: NoteListProps) {
  if (notes.length === 0) {
    return <div className="text-sm text-(--text-muted) p-2 italic">No notes found.</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {notes.map(note => (
        <div 
          key={note.id}
          onClick={() => onSelect(note.id)}
          className={`px-3 py-2 rounded-lg cursor-pointer flex flex-col transition-colors ${selectedId === note.id ? 'bg-(--surface-active) border-l-2 border-blue-500' : 'hover:bg-(--surface-hover) border-l-2 border-transparent'}`}
        >
          <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium text-(--text-primary) truncate">{note.title || 'Untitled'}</span>
             <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--surface-secondary) border border-(--border-subtle) text-(--text-secondary) uppercase font-mono">{note.format}</span>
          </div>
          <span className="text-xs text-(--text-muted) truncate">{new Date(note.updatedAt).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}
