import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LazyEditor as Editor } from "@/components/ui/LazyEditor";
import { Note } from '@/app/(tools)/note-vault/types/note-vault';
import { useNoteWorker } from '@/app/(tools)/note-vault/hooks/useNoteWorker';
import { ToolCopilot } from "@/components/ai/ToolCopilot";
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code, 
  Quote, 
  Link, 
  Image, 
  Table, 
  Eye, 
  Edit3, 
  Columns 
} from 'lucide-react';

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

// RFC-4180 compliant CSV Parser
function parseCSV(text: string): string[][] {
  try {
    if (!text.trim()) return [['']];
    
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell);
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        row.push(cell);
        lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    
    row.push(cell);
    lines.push(row);
    
    // Clean up empty trailing row if any
    if (lines.length > 1 && lines[lines.length - 1].length === 1 && lines[lines.length - 1][0] === '') {
      lines.pop();
    }
    
    return lines;
  } catch (error) {
    console.error("CSV parse error:", error);
    return [['Error parsing CSV']];
  }
}

// RFC-4180 compliant CSV Generator
function stringifyCSV(grid: string[][]): string {
  return grid.map(row => 
    row.map(cell => {
      const escaped = cell.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

// Convert 0 -> A, 25 -> Z, 26 -> AA
const getColumnLabel = (index: number): string => {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

export default function NoteEditor({ note, onChange }: NoteEditorProps) {
  const [content, setContent] = useState(note.content);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('split');
  const { runTask } = useNoteWorker();
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

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

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
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

  // Parse CSV content for Table view
  const grid = useMemo(() => {
    return parseCSV(content);
  }, [content]);

  // CSV Editing functions
  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const newGrid = grid.map((row, r) => 
      row.map((cell, c) => (r === rowIndex && c === colIndex) ? val : cell)
    );
    handleChange(stringifyCSV(newGrid));
  };

  const addRow = () => {
    const numCols = grid[0]?.length || 1;
    const newRow = Array(numCols).fill('');
    const newGrid = [...grid, newRow];
    handleChange(stringifyCSV(newGrid));
  };

  const deleteRow = () => {
    if (grid.length <= 1) return;
    const newGrid = grid.slice(0, -1);
    handleChange(stringifyCSV(newGrid));
  };

  const addColumn = () => {
    const newGrid = grid.map(row => [...row, '']);
    handleChange(stringifyCSV(newGrid));
  };

  const deleteColumn = () => {
    if (grid[0]?.length <= 1) return;
    const newGrid = grid.map(row => row.slice(0, -1));
    handleChange(stringifyCSV(newGrid));
  };

  const clearTable = () => {
    const newGrid = grid.map(row => row.map(() => ''));
    handleChange(stringifyCSV(newGrid));
  };

  const insertMarkdown = (type: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const selection = editor.getSelection();
    const model = editor.getModel();
    if (!model || !selection) return;

    const text = model.getValueInRange(selection);

    let prefix = '';
    let suffix = '';
    let placeholder = '';

    switch (type) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        placeholder = 'bold text';
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        placeholder = 'italic text';
        break;
      case 'h1':
        prefix = '# ';
        placeholder = 'Heading 1';
        break;
      case 'h2':
        prefix = '## ';
        placeholder = 'Heading 2';
        break;
      case 'h3':
        prefix = '### ';
        placeholder = 'Heading 3';
        break;
      case 'code':
        if (text.includes('\n')) {
          prefix = '```\n';
          suffix = '\n```';
          placeholder = 'code block';
        } else {
          prefix = '`';
          suffix = '`';
          placeholder = 'code';
        }
        break;
      case 'quote':
        prefix = '> ';
        placeholder = 'Blockquote';
        break;
      case 'bullet':
        prefix = '- ';
        placeholder = 'List item';
        break;
      case 'number':
        prefix = '1. ';
        placeholder = 'List item';
        break;
      case 'task':
        prefix = '- [ ] ';
        placeholder = 'Task item';
        break;
      case 'link':
        prefix = '[';
        suffix = '](https://example.com)';
        placeholder = 'link text';
        break;
      case 'image':
        prefix = '![';
        suffix = '](image-url)';
        placeholder = 'image alt';
        break;
      case 'table':
        prefix = '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n';
        break;
      default:
        break;
    }

    const replacement = text || placeholder;
    const fullText = `${prefix}${replacement}${suffix}`;

    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );

    const op = {
      range,
      text: fullText,
      forceMoveMarkers: true,
    };

    editor.executeEdits('markdown-toolbar', [op]);

    // Select the inserted text/placeholder so it's highlighted for immediate editing
    if (!text && placeholder) {
      const newStartColumn = selection.startColumn + prefix.length;
      const newEndColumn = newStartColumn + placeholder.length;
      editor.setSelection(
        new monaco.Selection(
          selection.startLineNumber,
          newStartColumn,
          selection.startLineNumber,
          newEndColumn
        )
      );
    } else {
      const newEndLine = selection.startLineNumber + fullText.split('\n').length - 1;
      const lastLineLength = fullText.split('\n')[fullText.split('\n').length - 1].length;
      const newEndColumn = (fullText.split('\n').length === 1) 
        ? selection.startColumn + fullText.length 
        : lastLineLength + 1;

      editor.setSelection(
        new monaco.Selection(
          selection.startLineNumber,
          selection.startColumn,
          newEndLine,
          newEndColumn
        )
      );
    }
    
    editor.focus();
  };

  const isMarkdown = note.format === 'markdown';
  const isCSV = note.format === 'csv';

  return (
    <div className="flex flex-col h-full w-full">
      {/* Markdown Sub-Toolbar */}
      {isMarkdown && (
        <div className="h-11 border-b border-(--border-subtle) bg-(--surface-secondary)/40 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 select-none">
          {/* Formatting tools */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-1">
            {viewMode !== 'preview' && (
              <>
                <button
                  onClick={() => insertMarkdown('bold')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('italic')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic size={14} />
                </button>
                <div className="h-4 w-px bg-(--border-subtle) mx-1.5 shrink-0" />
                <button
                  onClick={() => insertMarkdown('h1')}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  onClick={() => insertMarkdown('h2')}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  onClick={() => insertMarkdown('h3')}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Heading 3"
                >
                  H3
                </button>
                <div className="h-4 w-px bg-(--border-subtle) mx-1.5 shrink-0" />
                <button
                  onClick={() => insertMarkdown('bullet')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('number')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('task')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Task List"
                >
                  <CheckSquare size={14} />
                </button>
                <div className="h-4 w-px bg-(--border-subtle) mx-1.5 shrink-0" />
                <button
                  onClick={() => insertMarkdown('code')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Code Block"
                >
                  <Code size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('quote')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Blockquote"
                >
                  <Quote size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('link')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Insert Link"
                >
                  <Link size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('image')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Insert Image"
                >
                  <Image size={14} />
                </button>
                <button
                  onClick={() => insertMarkdown('table')}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                  title="Insert Table"
                >
                  <Table size={14} />
                </button>
              </>
            )}
          </div>

          {/* View mode switcher */}
          <div className="flex bg-(--surface-hover) rounded-lg p-0.5 border border-(--border-subtle) shrink-0 ml-2">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'edit' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Edit3 size={12} />
              Write
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'split' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Columns size={12} />
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'preview' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Eye size={12} />
              Preview
            </button>
          </div>
        </div>
      )}

      {/* CSV Sub-Toolbar */}
      {isCSV && (
        <div className="h-11 border-b border-(--border-subtle) bg-(--surface-secondary)/40 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 select-none">
          {/* Table editing tools */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {viewMode !== 'edit' && (
              <>
                <button
                  onClick={addRow}
                  className="px-2 py-1 bg-(--surface-hover) hover:bg-(--surface-active) border border-(--border-subtle) rounded-md text-xs text-(--text-primary) font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Add Row at bottom"
                >
                  + Row
                </button>
                <button
                  onClick={deleteRow}
                  disabled={grid.length <= 1}
                  className="px-2 py-1 bg-(--surface-hover) hover:bg-(--surface-active) disabled:opacity-40 border border-(--border-subtle) rounded-md text-xs text-(--text-primary) font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Delete last row"
                >
                  - Row
                </button>
                <div className="h-4 w-px bg-(--border-subtle) mx-1 shrink-0" />
                <button
                  onClick={addColumn}
                  className="px-2 py-1 bg-(--surface-hover) hover:bg-(--surface-active) border border-(--border-subtle) rounded-md text-xs text-(--text-primary) font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Add Column at right"
                >
                  + Col
                </button>
                <button
                  onClick={deleteColumn}
                  disabled={grid[0]?.length <= 1}
                  className="px-2 py-1 bg-(--surface-hover) hover:bg-(--surface-active) disabled:opacity-40 border border-(--border-subtle) rounded-md text-xs text-(--text-primary) font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Delete last column"
                >
                  - Col
                </button>
                <div className="h-4 w-px bg-(--border-subtle) mx-1 shrink-0" />
                <button
                  onClick={clearTable}
                  className="px-2 py-1 hover:text-red-500 text-xs text-(--text-muted) hover:text-red-500 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  title="Clear all cell contents"
                >
                  Clear
                </button>
              </>
            )}
          </div>

          {/* View mode switcher */}
          <div className="flex bg-(--surface-hover) rounded-lg p-0.5 border border-(--border-subtle) shrink-0 ml-2">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'edit' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Edit3 size={12} />
              Write
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'split' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Columns size={12} />
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'preview' 
                  ? 'bg-(--surface-elevated) text-(--text-primary) shadow-sm' 
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              )}
            >
              <Table size={12} />
              Table
            </button>
          </div>
        </div>
      )}

      {/* Editor & Preview Workspace */}
      <div className="flex-1 w-full min-h-0 flex overflow-hidden">
        {/* Monaco Editor Pane */}
        {((!isMarkdown && !isCSV) || viewMode !== 'preview') && (
          <div className={cn("h-full relative min-w-0 flex-1", ((isMarkdown || isCSV) && viewMode === 'split') ? 'w-1/2' : 'w-full')}>
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
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                automaticLayout: true,
              }}
            />
          </div>
        )}
        
        {/* Markdown Preview Pane */}
        {isMarkdown && viewMode !== 'edit' && (
          <div className={cn(
            "h-full border-l border-(--border-subtle) bg-(--background) p-6 overflow-y-auto max-w-none break-words text-(--text-primary) leading-relaxed shrink-0",
            viewMode === 'split' ? 'w-1/2' : 'w-full',
            "[&_p]:mb-4 [&_p:last-child]:mb-0",
            "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-(--border-subtle)",
            "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-(--border-subtle)",
            "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-4",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4",
            "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4",
            "[&_li]:mb-1",
            "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:bg-(--surface-hover) [&_code]:text-blue-500 [&_code]:font-mono [&_code]:text-[0.9em]",
            "[&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:bg-(--surface-secondary) [&_pre]:border [&_pre]:border-(--border-subtle) [&_pre]:overflow-x-auto [&_pre]:mb-4",
            "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-(--text-secondary) [&_pre_code]:text-sm",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-(--text-muted) [&_blockquote]:mb-4",
            "[&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-400",
            "[&_table]:w-full [&_table]:mb-4 [&_table]:border-collapse",
            "[&_th]:border [&_th]:border-(--border-subtle) [&_th]:p-2 [&_th]:bg-(--surface-hover) [&_th]:text-left [&_th]:font-bold",
            "[&_td]:border [&_td]:border-(--border-subtle) [&_td]:p-2",
            "[&_hr]:border-t [&_hr]:border-(--border-subtle) [&_hr]:my-6"
          )}>
            <div dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
          </div>
        )}

        {/* CSV Table Editor Pane */}
        {isCSV && viewMode !== 'edit' && (
          <div className={cn(
            "h-full border-l border-(--border-subtle) bg-(--background) flex flex-col min-w-0 overflow-hidden shrink-0",
            viewMode === 'split' ? 'w-1/2' : 'w-full'
          )}>
            {/* Table Grid Scroll Container */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-(--border-subtle) rounded-xl overflow-hidden bg-(--surface)">
                <table className="w-full border-collapse table-fixed min-w-[400px]">
                  <thead>
                    <tr className="bg-(--surface-secondary) border-b border-(--border-subtle)">
                      <th className="w-10 border-r border-(--border-subtle) text-[10px] text-(--text-muted) font-mono py-1.5 text-center bg-(--surface-secondary)/80">
                        #
                      </th>
                      {grid[0]?.map((_, cIndex) => (
                        <th 
                          key={`col-header-${cIndex}`}
                          className="border-r border-(--border-subtle) text-[10px] text-(--text-muted) font-mono py-1.5 text-center font-bold"
                        >
                          {getColumnLabel(cIndex)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row, rIndex) => (
                      <tr 
                        key={`row-${rIndex}`}
                        className="border-b border-(--border-subtle) hover:bg-(--surface-hover)/20 last:border-0"
                      >
                        <td className="border-r border-(--border-subtle) text-[10px] text-(--text-muted) font-mono text-center bg-(--surface-secondary)/30 select-none">
                          {rIndex + 1}
                        </td>
                        {row.map((cellValue, cIndex) => (
                          <td 
                            key={`cell-${rIndex}-${cIndex}`}
                            className="border-r border-(--border-subtle) last:border-r-0 p-0"
                          >
                            <input
                              type="text"
                              value={cellValue}
                              onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)}
                              className="w-full bg-transparent border-0 outline-none focus:bg-(--surface-elevated) focus:ring-1 focus:ring-blue-500/50 text-xs text-(--text-primary) px-2.5 py-1.5 font-sans"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
